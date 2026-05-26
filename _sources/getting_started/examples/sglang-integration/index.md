# Mooncake x SGLang Integration

[Mooncake](https://github.com/kvcache-ai/Mooncake) and [SGLang](https://github.com/sgl-project/sglang) have a deep, multi-faceted integration that spans multiple inference acceleration scenarios. Mooncake provides both the **Transfer Engine** — a high-performance RDMA data plane for zero-copy KV cache transfer — and **Mooncake Store** — a distributed KV cache storage engine — as backends for SGLang's disaggregated serving and hierarchical caching systems.

---

## Integration Scenarios

### 1. PD Disaggregation (Transfer Engine)

Mooncake Transfer Engine serves as the KV cache transfer backend for SGLang's Prefill-Decode disaggregation. It uses GPUDirect RDMA to transfer KV caches between prefill and decode nodes with zero-copy, saturating multi-NIC bandwidth while keeping CPU overhead negligible. This is also the foundation for **Mooncake EP Backend** (expert parallelism for MoE models like DeepSeek-V3) and **EPD Disaggregation** (encoder-prefill-decode for multimodal models with Vision Transformers).

**Key Results (1P1D vs 2 Regular instances, Qwen2.5-7B):**
- ~30% lower Inter-Token Latency (ITL) at comparable throughput
- Better TTFT under higher request rates
- See [PD Disaggregation Performance](../../../performance/sglang-benchmark-results-v1) for full benchmarks.

### 2. HiCache L3 Backend (Mooncake Store)

Mooncake Store serves as the L3 storage backend for SGLang HiCache, a hierarchical KV caching system spanning GPU (L1) → CPU (L2) → Distributed Memory Pool (L3). It aggregates memory across the entire cluster into a large distributed pool, enabling KV caches to be shared by all SGLang instances with RDMA-accelerated data transfer.

**Key Results (multi-turn conversation benchmark):**
- Mooncake-backed HiCache maintains a consistently high KV cache hit rate as conversation rounds grow, while L2-only drops off sharply once CPU memory is exhausted
- Pre-populated Mooncake achieves the best prefill performance (lowest TTFT)
- See [HiCache Benchmark Results](../../../performance/sglang-hicache-benchmark-results-v1) for full benchmarks.

---

## Getting Started

Choose your scenario:

| Scenario | Document |
|----------|----------|
| PD Disaggregation (KVCache transfer) | [PD Disaggregation Guide](../sglang-integration-v1) |
| HiCache L3 Backend (Quick Start) | [HiCache Quick Start](hicache-quick-start) |
| HiCache L3 Backend (Complete Guide) | [HiCache Complete Guide](hicache-integration-v1) |

::: {toctree}
:maxdepth: 1
:hidden:

../sglang-integration-v1
hicache-quick-start
hicache-integration-v1
:::
