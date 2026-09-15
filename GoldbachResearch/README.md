# GoldbachResearch

**结论：本项目没有证明强哥德巴赫猜想。**

这是一次包含并行数学分析、独立审查和 Lean 形式化的研究尝试。
猜想的全称命题仍未解决；下面的归约、障碍定理和有限验证不能替代它。
截至本次检索，美国数学学会 [2026 年文章](https://mathvoices.ams.org/featurecolumn/2026/02/01/does-mathematics-progress/)
仍明确说明该猜想没有已知的一般证明。

## 2026-09-14 新路线与反例搜索

本轮实际检验了“立方根筛 + Liouville 素因子奇偶性”路线，并找到了它的一个加强引理的反例：
N=68 时筛后有 5 个候选补数，但只有 2 个素数，因此“素数至少占一半”不成立。
这不是哥德巴赫反例；68=7+61=31+37 已由 Lean 验证。

反例搜索完整检查了 4 到 1000000 的偶数，并抽查了 4000 个超过 4*10^18 且小于 2^64 的偶数，
全部找到素数分解。三组代表性大数分解另有可独立检验的 Lucas 素性证书。
批量搜索是普通程序计算，**未在 Lean 中重验**，也未验证整个大数区间。
详情、未证输入和复现命令见 [本轮研究报告](notes/parity-route-and-search.md)，
原始结果见 [summary.json](experiments/results/summary.json)。
另外扫描了全部 30315 个 `2*41#` 倍数和全部 15 个 `2*47#` 倍数，
每个目标都在首项 `p <= 1000` 内找到分解；结果见
[primorial-search.json](experiments/results/primorial-search.json)。

## 要证明的命题

`Prime n` 使用通常的自然数素数定义：`2 <= n`，且每个自然数因子只能是 `1` 或 `n`。
`Goldbach n` 表示存在两个素数，其和等于 `n`；允许两个素数相同。

```lean
def StrongGoldbach : Prop :=
  forall n : Nat, 4 <= n -> n % 2 = 0 -> Goldbach n
```

`StrongGoldbach` 是待证命题的定义，**不是已证明的定理**。
项目仅依赖 Lean 自带的 `Std`；未安装或依赖 Mathlib。

## 已形式化的内容

| 文件 | 已证明的内容 |
| --- | --- |
| [Basic.lean](GoldbachResearch/Basic.lean) | 素数判定和有限分解搜索与数学定义完全等价 |
| [Reductions.lean](GoldbachResearch/Reductions.lean) | 反射搜索、半区间搜索、奇素数归约、有限区间与无限尾部的逻辑关系 |
| [Counting.lean](GoldbachResearch/Counting.lean) | 表示数为正当且仅当存在分解；通用集合交叠计数下界及条件性推论 |
| [Obstructions.lean](GoldbachResearch/Obstructions.lean) | 任意固定有限素数集合都不能为所有充分大的偶数提供一个加数 |
| [Progressions.lean](GoldbachResearch/Progressions.lean) | 对固定有限候选集合，构造任意大的偶数目标，使所有候选补数都不是素数 |
| [SieveReduction.lean](GoldbachResearch/SieveReduction.lean) | 任何反例都必须让每个候选素数的补数被一个严格真因子覆盖 |
| [SmallFactor.lean](GoldbachResearch/SmallFactor.lean) | 将真因子覆盖加强为素因子 `q` 且 `q*q <= N-p`，并形式化立方根筛下的“素数或半素数”分类 |
| [FiniteLocal.lean](GoldbachResearch/FiniteLocal.lean) | 每个有限模数剩余类都有显式合数代表元，局部模信息不能认证素性 |
| [ParityExample.lean](GoldbachResearch/ParityExample.lean) | 核验 N=68 的筛后候选、分解及“素数至少占一半”的反例 |
| [LiouvilleToy.lean](GoldbachResearch/LiouvilleToy.lean) | 形式化说明全部整数上的 Liouville 卷积界不能转移为素数支撑结论 |
| [YunAudit.lean](GoldbachResearch/YunAudit.lean) | 形式化检查因子消除预印本的基数不等式与集合包含错误 |
| [Certificates.lean](GoldbachResearch/Certificates.lean) | 使用 `decide +kernel` 核验所有 `4 <= n <= 1000` 的偶数，并转换成 `GoldbachUpTo 1000` |
| [Audit.lean](Audit.lean) | 自动检查所有公开项目定理的递归公理依赖 |

其中 `counterexample_interval_residue_cover` 证明了 `p % q = N % q` 且 `q*q <= N`，把反例覆盖直接写成小素数剩余类。

计数归约和尾部归约是等价改写或条件性结论，没有消除原问题的困难。
`goldbach_of_marginal_count_bound` 明确需要额外的计数不等式作为参数；
本项目没有证明该不等式对所有偶数成立。

有限证书 `checkUpTo_1000` 的公理依赖为空；`goldbachUpTo_1000` 经数学等价关系
转换后依赖标准基础公理 `propext` 和 `Quot.sound`。
这一小范围证书用于核对形式化链条，不是新的数值验证纪录。

## 两条经过审查的诊断

**固定有限素数候选不够。** 对有限素数列表 `P` 和任意自然数阈值 `T`，令

\[
N=2(T+2)\prod_{p\in P}p.
\]

这是至少为 `4` 和 `T` 的偶数。每个 `p` 都整除 `N-p`，且 `2 <= p < N-p`，
所以 `N-p` 不是素数。该结论已在 Lean 中证明，包括空列表和重复元素。
例如 `P=[2,3,5], T=0` 给出 `N=120`，但 `120=7+113`：它没有反驳哥德巴赫猜想。

**素数分布主项不够。** [解析研究笔记](notes/analytic-review.md) 完整证明了：
存在素数子集 `A`，删除量仅为 `O(x / log^2 x)`，保留素数定理和所有固定模互素剩余类的分布主项，
却仍有无穷多个偶数不属于 `A+A`。还可以保留任意指定有限范围内的全部素数。
证明通过表示数的平均值选择偶数，再删除各分解中的较大素数，并控制所有 `x` 上的累计删除量。

这一普通数学证明已经过另一 agent 独立审查，**尚未 Lean 形式化**，也不声称是新发现。
`A` 是人为选取的子集，因此结论仅说明这些分布信息本身不充分，
不能推出完整素数集合的哥德巴赫猜想为假，也不能排除使用额外算术结构的证明。

下降法的具体失败也已记录在 [descent-obstruction.md](notes/descent-obstruction.md)：
即使所有较小偶数都能由一个抽象的“素数集合”表示，也不能推出下一个偶数有表示。
对真实素数集合，假想反例只给出 `N - p` 的因子覆盖；它没有产生更小的哥德巴赫反例。

`strongGoldbach_iff_no_factor_cover` 将这一步形式化为严格等价：
强哥德巴赫猜想成立，当且仅当不存在这样的偶数因子覆盖。
这是经过核验的等价重述；排除覆盖仍与原问题同样困难。
关于 Möbius 反演、正权筛和奇偶障碍的逐步分析见
[weighted-sieve-obstruction.md](notes/weighted-sieve-obstruction.md) 和
[sieve-fourier-obstruction.md](notes/sieve-fourier-obstruction.md)。
Type II 展开为何仍含有同一个素数相关性，见
[typeII-circularity.md](notes/typeII-circularity.md)。
短区间素数与因子覆盖的数量级审查见
[short-interval-cover.md](notes/short-interval-cover.md)。
有限模数与 CRT 的代数路线见 [finite-modulus-obstruction.md](notes/finite-modulus-obstruction.md)：
单位剩余类的加法只能检测奇偶性，不能检测整数是否真的为素数。
这里的限制针对固定模数、仅保留同余信息的判定，不能推广为所有代数或筛法均不可能成功。
例如，让筛选界随待测整数增长到其平方根，并结合大小信息，就能通过试除精确判定素性。

## 仍然缺少的步骤

必须对每个大于等于 `4` 的偶数证明 `representationCount n > 0`。
研究笔记给出了圆法的精确条件归约，但没有建立其中所需的、对每个偶数成立的次弧估计。
仅有平均估计、有限枚举、概率启发或未证明的辅助引理，都不能完成这一步。

已发表的 [截至 4 × 10^18 的计算验证](https://sweet.ua.pt/tos/bib/4.12.html)
属于外部背景资料，本项目没有将它导入为公理，也没有用 Lean 重新核验该范围。

继续检索到的 2026 年论文 [Theorem (1+1.9)](https://arxiv.org/abs/2606.05224)
证明的是 `N = p + r q`，其中 `r` 可以是受控大小的素数；论文明确把 `r = 1` 的二元哥德巴赫情形列为仍未解决的边界。
类似地，Chen 型结果把第二项放宽为至多两个素因子的数。放宽后的表示不能通过 Lean 中的素数定义自动还原为 `Goldbach`。

我还审查了几篇标题声称“完整证明”的预印本。典型错误是从两个端点有分解，
跳到中间所有偶数也有分解；端点信息不能推出这一结论。另一些论证直接假定形如 `p + 2k` 仍为素数，
实质上把需要证明的素数分布再次当作前提。因此这些文本不能作为项目的证明输入。
例如 [Laporta 的 arXiv 条目](https://arxiv.org/abs/2006.04547)目前标记为 withdrawn，
并明确注明其 Lemma 1 是错误的；标题本身不能替代同行审查和逐行证明。
具体的小模数反例和 Barca 论文的量词缺口见
[claimed-proof-audit.md](notes/claimed-proof-audit.md)。

## 构建与审计

固定工具链为 `leanprover/lean4:v4.33.1`。在本目录使用 PowerShell：

```powershell
& 'C:\Users\admin\.elan\bin\lake.exe' build
& 'C:\Users\admin\.elan\bin\lake.exe' env lean Audit.lean
```

首次构建的有限证书在本机约耗时 93 秒，观测到内核归约进程占用约 7 GB 内存；
后续未修改源码的构建会复用 Lake 缓存。

默认构建包含审计目标。审计递归检查所有公开项目定理的公理依赖，
仅允许 Lean 的标准基础公理 `propext`、`Classical.choice`、`Quot.sound`。
因此不能把结果描述为“完全不依赖任何公理”。
出现 `sorryAx`、原生计算信任公理或任何额外公理都会导致审计失败。
最终信任边界仍包括所使用的 Lean 内核及其标准基础。
审计的声明计数包含 Lean 自动生成的辅助定理，不能用该数量衡量完整证明的进度。
