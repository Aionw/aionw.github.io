# Mooncake Store

## Overview

Mooncake Store is a high-performance **distributed key-value (KV) cache storage engine** designed for LLM inference scenarios. Unlike general-purpose caches (e.g., Redis, Memcached), it is purpose-built for immutable KV cache objects — keys are derived from values via hashing, and values remain immutable after insertion until evicted.

It provides object-level `Put`/`Get`/`Remove` APIs with strong consistency, multi-replica support for hotspot mitigation, zero-copy RDMA transfers via the Transfer Engine, and multi-layer storage (RAM → SSD). Typical use cases include distributed KVCache sharing in vLLM/SGLang disaggregated serving deployments.

Mooncake Store consists of two core components:
- **Master Service** (`mooncake_master`): Orchestrates the cluster-wide storage pool, manages node membership, handles object space allocation, and runs eviction policies. It exposes an RPC service and optionally an HTTP metadata server for the Transfer Engine.
- **Client**: Embedded into the inference process (or run as a standalone service), each Client contributes a segment of memory to the distributed cache and performs actual data transfers peer-to-peer, bypassing the Master.

This page summarizes useful flags, environment variables, and HTTP endpoints to help advanced users tune Mooncake Master and observe metrics. For architecture and design details, see [Mooncake Store Design](../design/mooncake-store.md).

## Deployment Examples

Example (enable embedded HTTP metadata and metrics):

```bash
mooncake_master \
  --enable_http_metadata_server=true \
  --http_metadata_server_host=0.0.0.0 \
  --http_metadata_server_port=8080 \
  --rpc_thread_num=64 \
  --metrics_port=9003 \
  --enable_metric_reporting=true
```

Example (resolve the master RPC address from a stable interface name in a container):

```bash
mooncake_master \
  --rpc_interface=eth0 \
  --enable_http_metadata_server=true \
  --http_metadata_server_host=0.0.0.0 \
  --http_metadata_server_port=8080
```

This resolves the current IPv4 address of `eth0` at startup and uses it as the final `rpc_address`.

Example (use free-ratio-first allocation strategy for better load balancing):

```bash
mooncake_master \
  --allocation_strategy=free_ratio_first \
  --enable_http_metadata_server=true \
  --http_metadata_server_port=8080
```

**Tips:**

In addition to command-line flags, the Master also supports configuration via JSON and YAML files. For example:

```bash
mooncake_master \
  --config_path=mooncake-store/conf/master.yaml
```

For config files, the equivalent setting is:

```yaml
rpc_interface: "eth0"
rpc_port: 50051
```

For detailed command line option we offered, please refer to [Master Startup Flags](#master-startup-flags-with-defaults)

## Observability
### Metrics Endpoints

The master exposes Prometheus-style metrics over HTTP on `--metrics_port`:

- `GET /metrics` — Prometheus format (`text/plain; version=0.0.4`).
- `GET /metrics/summary` — Human-readable summary.

Examples:

```bash
curl -s http://<master_host>:9003/metrics
curl -s http://<master_host>:9003/metrics/summary
```

For detailed metrics we offer, please refer to [Observability](../getting_started/observability.md).

### Set the Log Level for yalantinglibs coro_rpc and coro_http
By default, the log level is set to warning. You can customize it using the following environment variable:

`export MC_YLT_LOG_LEVEL=info`

This sets the log level for yalantinglibs (including coro_rpc and coro_http) to info.

Available log levels: trace, debug, info, warn (or warning), error, and critical.


## Client/Engine Tuning (Env Vars, with defaults)

- Topology discovery (Store Client → Transfer Engine)
  - `MC_MS_AUTO_DISC` (default `1`): Auto-discover NIC/GPU topology. Set `0` to disable and provide `rdma_devices` manually.
  - `MC_MS_FILTERS` (default empty): Optional comma-separated NIC whitelist when auto-discovery is enabled (e.g., `mlx5_0,mlx5_2`).
  - If `MC_MS_AUTO_DISC=0`, pass `rdma_devices` (comma-separated) to the Python `setup(...)` call.

- Transfer Engine metrics (disabled by default)
  - `MC_TE_METRIC` (default `0`/unset): Set to `1` to enable periodic engine metrics logging. **Note:** Not supported when using Transfer Engine TENT.
  - `MC_TE_METRIC_INTERVAL_SECONDS` (default `5`): Positive integer seconds between reports (effective only if metrics enabled).

- Client metrics (enabled by default)
  - `MC_STORE_CLIENT_METRIC` (default `1`): Client-side metrics on by default; set `0` to disable entirely.
  - `MC_STORE_CLIENT_METRIC_INTERVAL` (default `0`): Reporting interval in seconds; `0` collects but does not periodically report.
  - `MC_STORE_CLIENT_MIN_PORT` (default `12300`): Minimum local port for client connections. Must be in range 1024–32767 or 61000–65535 (well-known and ephemeral ports are excluded). Falls back to default on invalid input.
  - `MC_STORE_CLIENT_MAX_PORT` (default `14300`): Maximum local port for client connections. Same range constraints as `MC_STORE_CLIENT_MIN_PORT`; must be ≥ `MC_STORE_CLIENT_MIN_PORT`.

- Local memcpy optimization (Store transfer path)
  - `MC_STORE_MEMCPY` (default `0`/false): Set to `1` to prefer local memcpy when source/destination are on the same client.

- Memory allocator (mmap buffer path)
  - `MC_STORE_USE_HUGEPAGE` (default unset): Set to `1` to request HugeTLB-backed `mmap()` allocations for the direct allocation path. This requires hugepages to be reserved on the host first.
  - `MC_STORE_HUGEPAGE_SIZE` (default `2MB`): Hugepage size to request when hugepages are enabled. Supported values are `2MB` and `1GB`.
  - `MC_MMAP_ARENA_POOL_SIZE` (default unset): Size of the pre-allocated arena pool for mmap buffer allocations. Accepts human-readable sizes (e.g., `8gb`, `20gb`). Setting this variable explicitly enables the arena; if the arena is enabled via gflag instead, the default pool size is `8gb`. The arena is allocated once at first use and serves subsequent allocations via lock-free atomic bump pointer. Set this to match available hugepage capacity.
  - `MC_DISABLE_MMAP_ARENA` (default unset): Set to `1` to disable the arena and fall back to per-call `mmap()`, even if the arena was explicitly requested. Also accepts `true`, `yes`, or `on`. This must be set before the first Mooncake mmap-buffer allocation in the process. Useful for debugging or when hugepage capacity is limited. Lazy arena initialization is one-shot per process, so after a failed first attempt you need to restart the process to retry arena bring-up.

For HiCache-style deployments or other large buffer allocations, pre-flight the host with the sizing helper before reserving hugepages:

```bash
python3 scripts/check_hicache_hugepage_requirements.py \
  --tp-size 4 \
  --hicache-size 64gb \
  --global-segment-size 8gb \
  --arena-pool-size 56gb \
  --available-hugetlb 512gb

sudo sysctl -w vm.nr_hugepages=262144
grep -E 'HugePages_Total|HugePages_Free|Hugepagesize' /proc/meminfo
```

The `64gb` / `56gb` inputs above are tuned examples for large HiCache deployments, not defaults. The arena remains disabled unless you explicitly enable it. If you enable it via gflag without an env override, the default pool size is `8gb`. On smaller hosts, start with `8gb` or `16gb` and size upward with the helper.

### Quick Tips

- Scale `--rpc_thread_num` with available CPU cores and workload.
- Start with default eviction settings; adjust `--eviction_high_watermark_ratio` and `--eviction_ratio` based on memory pressure and object churn.
- Use `/metrics/summary` during bring-up; integrate `/metrics` with Prometheus/Grafana for production.



## Master Startup Flags (with defaults)

- Configuration File
  - `--config_path` (str, default empty): Path to JSON or YAML config file. When set, other flags can be specified in the config file using equivalent keys (e.g., `rpc_port: 50051`).

- RPC Related
  - `--rpc_port` (int, default 50051): RPC listen port.
  - `--rpc_thread_num` (int, default min(4, CPU cores)): RPC worker threads. If not set, uses `--max_threads` (default 4) capped by CPU cores.
  - `--rpc_address` (str, default `0.0.0.0`): RPC bind address.
  - `--rpc_interface` (str, default empty): Network interface used to resolve the final RPC address. When set, Mooncake Master resolves the interface's current IPv4 address at startup and uses it as the final `rpc_address`. This overrides `--rpc_address`.
  - `--rpc_conn_timeout_seconds` (int, default `0`): RPC idle connection timeout; `0` disables.
  - `--rpc_enable_tcp_no_delay` (bool, default `true`): Enable TCP_NODELAY.

- Metrics
  - `--enable_metric_reporting` (bool, default `true`): Periodically log master metrics to INFO.
  - `--metrics_port` (int, default `9003`): HTTP port for `/metrics` endpoints.

- HTTP Metadata Server For Mooncake Transfer Engine
  - `--enable_http_metadata_server` (bool, default `false`): Enable embedded HTTP metadata server.
  - `--http_metadata_server_host` (str, default `0.0.0.0`): Metadata bind host.
  - `--http_metadata_server_port` (int, default `8080`): Metadata TCP port.

- Allocation Strategy
  - `--allocation_strategy` (str, default `random`): Memory allocation strategy for replica placement. Available options:
    - `random`: Pure random selection across segments (baseline, fastest).
    - `free_ratio_first`: Free-ratio-first strategy. Samples multiple candidates and selects those with highest free space ratio for better load balancing.
    - `cxl`: CXL-aware allocation strategy.
  - `--memory_allocator` (str, default `offset`): Memory allocator for global segments. Available options:
    - `offset`: Offset-based allocator (default).
    - `cachelib`: Use cachelib memory allocator.

- Eviction and TTLs
  - `--default_kv_lease_ttl` (duration, default `5000` ms): Default lease TTL for KV objects. The default unit is milliseconds, so `5000` means `5000ms`. Duration strings such as `5000ms`, `5s`, `30m`, or `1h` are also supported.
  - `--default_kv_soft_pin_ttl` (duration, default `1800000` ms): Soft pin TTL (30 minutes). The default unit is milliseconds, so `1800000` means `1800000ms`. Duration strings such as `1800000ms`, `30m`, or `1h` are also supported.
  - `--allow_evict_soft_pinned_objects` (bool, default `true`): Allow evicting soft-pinned objects.
  - `--eviction_ratio` (double, default `0.05`): Fraction evicted when hitting high watermark.
  - `--eviction_high_watermark_ratio` (double, default `0.95`): Usage ratio to trigger eviction.
  - `--client_ttl` (int64, default `10` s): Seconds a client stays considered alive after the last heartbeat. If this TTL elapses without a refresh, the master treats the client as disconnected and may unmount its segments.
  - `--enable_disk_eviction` (bool, default `true`): Enable disk eviction for storage backend.
  - `--quota_bytes` (uint64, default `0`): Storage backend quota in bytes. `0` uses 90% of capacity as default.
  - `--put_start_discard_timeout_sec` (uint64, default `120`): Timeout in seconds for discarding uncompleted PutStart operations.
  - `--put_start_release_timeout_sec` (uint64, default `60`): Timeout in seconds for releasing space allocated in uncompleted PutStart operations.

- NoF SSD Eviction (requires `USE_NOF=ON` at build time)
  - `--nof_eviction_ratio` (double, default `0.05`): Fraction of objects to evict when NoF SSD space is full.
  - `--nof_eviction_high_watermark_ratio` (double, default `0.95`): Usage ratio to trigger NoF SSD eviction.
  - `--nof_heartbeat_interval_sec` (int64, default `5`): How often master probes each mounted NoF segment.
  - `--nof_heartbeat_probe_timeout_ms` (uint32, default `1000`): Timeout in milliseconds for a single NoF heartbeat probe.
  - `--nof_heartbeat_failures_threshold` (uint32, default `5`): Consecutive NoF heartbeat failures required before unmounting a NoF segment.

- Offload & Promotion
  - `--enable_offload` (bool, default `false`): Enable offload to local disk.
  - `--offload_on_evict` (bool, default `false`): Defer LOCAL_DISK offload to eviction time instead of PutEnd.
  - `--offload_force_evict` (bool, default `false`): Force-evict objects exceeding offload capacity without disk offload.
  - `--promotion_on_hit` (bool, default `false`): Promote LOCAL_DISK-only keys to MEMORY on read access.
  - `--promotion_admission_threshold` (uint32, default `2`): Min access count (CountMinSketch) before promotion fires. Set `1` to disable second-touch gating.
  - `--promotion_queue_limit` (uint32, default `50000`): Max in-flight promotion tasks across all shards.

- High Availability (optional)
  - `--enable_ha` (bool, default `false`): Enable HA (requires etcd).
  - `--ha_backend_type` (str, default `etcd`): HA backend type. Available options: `etcd`, `redis`, `k8s`.
  - `--ha_backend_connstring` (str, default empty): HA backend connection string (e.g., `127.0.0.1:2379`). If unset and backend is `etcd`, falls back to `--etcd_endpoints`.
  - `--etcd_endpoints` (str, default empty unless HA config): etcd endpoints, semicolon separated.
  - `--cluster_id` (str, default `mooncake_cluster`): Cluster ID for persistence in HA mode.

- Task Manager (optional)
  - `--max_total_finished_tasks` (uint32, default `10000`): Maximum number of finished tasks to keep in memory. When this limit is reached, the oldest finished tasks will be pruned from memory.
  - `--max_total_pending_tasks` (uint32, default `10000`): Maximum number of pending tasks that can be queued in memory. When this limit is reached, new task submissions will fail with `TASK_PENDING_LIMIT_EXCEEDED` error.
  - `--max_total_processing_tasks` (uint32, default `10000`): Maximum number of tasks that can be processing simultaneously. When this limit is reached, no new tasks will be popped from the pending queue until some processing tasks complete.
  - `--max_retry_attempts` (uint32, default `10`): Maximum number of retry attempts for failed tasks. Tasks that fail with `NO_AVAILABLE_HANDLE` error will be retried up to this many times before being marked as failed.
  - `--pending_task_timeout_sec` (uint64, default `300`): Timeout in seconds for pending tasks. `0` means no timeout.
  - `--processing_task_timeout_sec` (uint64, default `300`): Timeout in seconds for processing tasks. `0` means no timeout.

- CXL Memory (optional)
  - `--enable_cxl` (bool, default `false`): Enable CXL memory support for segments.
  - `--cxl_path` (str, default `/dev/dax0.0`): DAX device path for CXL memory.
  - `--cxl_size` (uint64, default `0`): CXL memory size in bytes.

- DFS Storage (optional)
  - `--root_fs_dir` (str, default empty): DFS mount directory for storage backend, used in Multi-layer Storage Support.
  - `--global_file_segment_size` (int64, default `int64_max`): Maximum available space for DFS segments.

- MMAP Arena Allocator
  - `--use_mmap_arena_allocator` (bool, default `false`): Enable pre-allocated mmap arena pool allocator on the master side. The arena is allocated once at first use and serves subsequent allocations via lock-free atomic bump pointer.
  - `--mmap_arena_pool_size` (uint64, default `8589934592` (8GB)): Size of the pre-allocated arena pool in bytes. Only effective when `--use_mmap_arena_allocator=true`.

- Snapshot / Restore (optional)
  - `--enable_snapshot` (bool, default `false`): Enable periodic snapshot of master metadata data (effective when using the `offset` memory allocator).
  - `--snapshot_interval_seconds` (uint64, default `600`): Interval in seconds between periodic snapshots of master data.
  - `--snapshot_child_timeout_seconds` (uint64, default `300`): Timeout in seconds for each snapshot child process.
  - `--snapshot_retention_count` (uint32, default `2`): Number of recent snapshots to keep. Older snapshots beyond this limit will be automatically deleted.
  - `--snapshot_object_store_type` (str, required when snapshot enabled): Snapshot object store type: `local` for local filesystem, `s3` for S3 storage.
  - `--snapshot_backup_dir` (str, default empty): Optional local directory for snapshot backup. If empty (default), local backup is disabled. When set, it serves two purposes: (1) during snapshot persistence, data will be saved locally as a fallback if uploading to the backend fails; (2) during restore, downloaded metadata will also be saved to this directory as a local backup.
  - `--enable_snapshot_restore` (bool, default `false`): Enable restore from the latest snapshot at master startup.
  - `--snapshot_catalog_store_type` (str, default empty): Snapshot catalog store type. Available options: `""` (embedded), `redis`.
  - `--snapshot_catalog_store_connstring` (str, default empty): Optional connection string for snapshot catalog store (e.g., Redis connection string).
  - **Environment variable** `MOONCAKE_SNAPSHOT_LOCAL_PATH` (**required** when `--snapshot_object_store_type=local`): Persistent directory path for local snapshot storage. This variable **must** be set before starting the master; there is no default value. Example: `export MOONCAKE_SNAPSHOT_LOCAL_PATH=/data/mooncake_snapshots`.

  > **Warning: Managed Directory**
  >
  > The snapshot storage path (`MOONCAKE_SNAPSHOT_LOCAL_PATH` for local backend, or S3 bucket for S3 backend) is a **managed directory** exclusively controlled by the Mooncake snapshot system. **DO NOT store other files or data in this directory.** Old snapshots exceeding `--snapshot_retention_count` will be automatically and permanently deleted during cleanup. Use a dedicated, isolated directory for snapshot storage to avoid accidental data loss.


---

:::{toctree}
:caption: Advanced Topics
:maxdepth: 1

ssd-offload
../getting_started/observability
../getting_started/plugin-usage/3FS-USRBIO-Plugin
:::
