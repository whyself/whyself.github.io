---
title: "用 LambdaiCJ 迁移 gcoord"
excerpt: "记录把 gcoord 坐标转换库迁移到仓颉的过程：从目录拆分、公开入口，到 GeoJSON 支持和测试补齐。"
publishDate: 2026-06-14
listDate: "Jun 14, 2026"
wordCount: "1,500 Words"
tags:
  - 仓颉
  - 笔记
majorCategory: Articles
thumbnail: "/images/posts/cangjie-environment/cangjie-logo.svg"
draft: false
---

最近试着用 LambdaiCJ 做了一个 `gcoord` 的仓颉版。

`gcoord` 是一个地理坐标系转换库，原版由 TypeScript 实现，支持 WGS84、GCJ02、BD09、BD09MC、EPSG3857 等常见坐标系之间的转换。我的目标不是重新设计它，而是尽量按照原项目的结构和测试思路，把核心能力迁移到仓颉里。

## 参考的 TypeScript 项目结构

原仓库真正需要关注的是 `src/` 和 `test/`。

```text
gcoord/
├─ src/
│  ├─ index.ts                  # JS/TS 对外入口
│  ├─ transform.ts              # 统一转换 API
│  ├─ helper.ts                 # 工具函数 + GeoJSON 坐标遍历
│  ├─ geojson.ts                # GeoJSON 类型定义
│  └─ crs/                      # 各坐标系转换公式
│     ├─ index.ts               # CRS 枚举、别名、转换路由表
│     ├─ GCJ02.ts               # WGS84 <-> GCJ02
│     ├─ BD09.ts                # GCJ02 <-> BD09
│     ├─ BD09MC.ts              # BD09 <-> BD09MC
│     ├─ EPSG3857.ts            # WGS84 <-> EPSG3857/WebMercator
│     └─ WGS84.ts               # 空壳注释文件
│
├─ test/
│  ├─ fixtures/
│  │  ├─ china-cities.json      # 坐标样本数据
│  │  └─ each.ts                # 测试读取 fixture 的辅助函数
│  ├─ helpers/
│  │  └─ geojson.ts             # 构造 GeoJSON 的辅助函数
│  └─ unit/
│     ├─ transform.spec.ts      # transform 总入口测试
│     ├─ helper.spec.ts         # helper / coordEach 测试
│     └─ crs/                   # 各 CRS 转换测试
```

其中 `transform.ts` 是核心入口。

```typescript
export default function transform<T extends GeoJSON | Position>(
  input: T | string,
  crsFrom: CRSTypes,
  crsTo: CRSTypes
): T
```

它大致支持三类输入：

- 普通坐标数组：`[lng, lat]`
- GeoJSON 对象
- GeoJSON 字符串

处理流程也很直接：先检查输入和坐标系是否合法，如果 `from == to` 就原样返回；否则从 `crsMap` 里找到对应的转换函数。输入是字符串时先 `JSON.parse`，输入是坐标数组时直接转换，输入是 GeoJSON 时则遍历所有坐标并原地修改。

## 第一阶段：先迁移坐标数组

一开始我没有直接做完整 GeoJSON 支持，而是先把坐标数组的转换跑通。第一版目录大概是这样：

```text
gcoord_cj/
├─ cjpm.toml                    # 仓颉项目配置
├─ README.md                    # 使用说明
├─ CHANGELOG.md                 # 版本变更记录
├─ LICENSE                      # 开源许可证
├─ src/
│  ├─ transform.cj              # 对外 transform API
│  ├─ helper/
│  │  └─ helper.cj              # 断言、函数组合、数值辅助等
│  ├─ geojson/
│  │  └─ geojson.cj             # 第一阶段只定义 Position
│  └─ crs/
│     ├─ index.cj               # CRSType 与转换路由
│     ├─ gcj02.cj
│     ├─ bd09.cj
│     ├─ bd09mc.cj
│     ├─ epsg3857.cj
│     └─ wgs84.cj
├─ test/
│  └─ china-cities.json         # 从原项目保留的坐标样本数据
└─ scripts/
   └─ smoke_test.sh             # 快速构建或手动冒烟验证脚本
```

这里踩到的第一个点是：仓颉项目并不一定需要 `index.cj` 作为唯一入口文件，而是可以直接根据包路径暴露能力。所以我最后把 `transform.cj` 作为主要入口。

当时设计的暴露边界是：

- `public`：`transform()`、`Position`、`CRSType`
- `protected`：`getConverter()`、各 CRS 公式函数、`helper` 里的 `TransformFn` / `assert` / `compose`

根包里的 `transform.cj` 负责转发 `gcoord.geojson.*` 和 `gcoord.crs.*`，同时内部调用 `gcoord.crs.getConverter` 做路由。这样外部用户仍然只需要：

```text
import gcoord.*
```

另外，仓颉库项目需要把 `cjpm.toml` 里的输出类型从可执行程序改成静态库：

```toml
[package]
output-type = "static"
```

其他项目使用时再通过本地路径依赖引入：

```toml
[dependencies]
gcoord = { path = "../gcoord_cj" }
```

第一轮迁移后，几个核心模块基本成型：

- `transform.cj`：完成 `transform()` 的迁移，通过重载支持 `GeoPosition` 和字符串输入，暂时不处理完整 GeoJSON 对象
- `helper/helper.cj`：按 TypeScript 原实现迁移 `assert()`、`compose()` 等工具函数
- `geojson/geojson.cj`：先定义 `GeoPosition` 类型
- `crs/index.cj`：把枚举换成 `String` 类型的 `CRSType`，定义坐标系常量、别名和双层 HashMap 转换路由表

## 关于 Position 重名

迁移过程中还遇到过一次看起来像导入机制的问题。

我一开始以为，同 package 下在多个文件里 import 同一个 `Position` 类型，会在函数顶级签名里造成重复导入。后来发现真实原因不是这个，而是 `import lambdai4cj.prelude.*` 里也有一个叫 `Position` 的类型，导致了重名。

最后的解决方式很简单：把自己的坐标类型改名为 `GeoPosition`。

## 用 LambdaiCJ 迁移计算函数

坐标转换里最适合交给 AI 的部分，其实是纯运算函数。

我的做法是先把常量和函数依赖关系整理好，再让 `@ai` 模块参照原 TypeScript 文件生成仓颉代码：`@files` 里放源码文件，`@AIDeps` 描述原函数调用关系，再从 `china-cities.json` 中挑几个样本作为 `@test`。

这类任务涉及的仓颉语言特性不算多，更多是公式和数值误差控制，所以成功率比预期高。真正需要人工盯住的地方，反而是项目边界、包结构、公开入口和测试组织。

## 第二阶段：补上 GeoJSON 支持

后来我开始继续加 GeoJSON 支持。

最初的想法是照搬 TypeScript 的类型检查，但很快发现这条路不太顺。仓颉没有 TypeScript 那种根据返回值类型参与推断函数重载的写法，强行模仿原版的类型结构只会把代码变复杂。

找到仓颉 `stdx` 里的 JSON 支持后，我换了一个方案：不再强行还原 TS 类型系统，而是直接对 `JsonValue` 递归遍历。遇到坐标数组就转换，其他结构原样保留。

这样会少一些静态类型约束，但代码干净很多，也更符合这个阶段的目标：先让任意 GeoJSON 对象能完成坐标转换。

整理后的 `transform.cj` 入口变成了这样：

```text
public func transform<T>(input: Array<T>, crsFrom: CRSType, crsTo: CRSType): Array<Float64> where T <: ToString {
    return transformArrayPosition(input, crsFrom, crsTo)
}

public func transform(input: String, crsFrom: CRSType, crsTo: CRSType): Any {
    let value = JsonValue.fromStr(input)
    match (value.kind()) {
        case JsArray =>
            return transformJsonPosition(value.asArray(), crsFrom, crsTo)
        case JsObject =>
            transformJsonGeoJSONInPlace(value.asObject(), crsFrom, crsTo)
            return value
        case _ =>
            throw IllegalArgumentException("Invalid input coordinate: ${input}")
    }
}

public func transform(input: JsonValue, crsFrom: CRSType, crsTo: CRSType): JsonValue {
    match (input.kind()) {
        case JsArray =>
            let output = transformJsonPosition(input.asArray(), crsFrom, crsTo)
            return JsonArray(output.map<JsonValue>({ value => JsonFloat(value) }))
        case JsObject =>
            transformJsonGeoJSONInPlace(input.asObject(), crsFrom, crsTo)
            return input
        case _ =>
            throw IllegalArgumentException("Invalid input coordinate: ${input}")
    }
}
```

这时目录结构也随之调整：

```text
gcoord_cj/src/
├─ transform.cj
│  └─ 只放公开 transform 重载，负责分派 Array / String / JsonValue 输入
│
├─ coord/
│  └─ position.cj
│     ├─ GeoPosition
│     ├─ Array<T> -> GeoPosition
│     ├─ JsonArray -> Array<Float64>
│     └─ JsonArray 坐标写回工具
│
├─ geojson/
│  └─ json_transform.cj
│     ├─ JsonValue / JsonObject GeoJSON 原地转换逻辑
│     ├─ Feature / FeatureCollection
│     ├─ Point / LineString / Polygon
│     ├─ MultiPoint / MultiLineString / MultiPolygon
│     └─ GeometryCollection
│
├─ crs/
│  ├─ index.cj
│  │  ├─ CRSType 常量和别名
│  │  ├─ CRS 转换矩阵
│  │  ├─ assertCRS()
│  │  └─ getTransformFn()
│  ├─ wgs84.cj
│  ├─ gcj02.cj
│  ├─ bd09.cj
│  ├─ bd09mc.cj
│  └─ epsg3857.cj
│
└─ helper/
   └─ helper.cj
      └─ assert / compose 等通用工具
```

公开给用户使用的入口仍然只保留 `transform`。

## 测试与收尾

最后让 GPT 根据 `gcoord/test/` 里的测试思路补了一个 shell 测试脚本。这个脚本还真测出了一个问题：仓颉的 `toString()` 在某些数值转换场景下会带来精度丢失。

后来加了一个兼容函数 `toFloat64()`，问题就解决了。

这次迁移下来，我对 LambdaiCJ 的感觉是：它很适合帮忙迁移纯运算函数，尤其是已有源码、调用关系和测试样本都比较明确的时候。但包结构、公开 API、依赖边界、测试策略这些东西，还是需要人站在项目层面盯着。

换句话说，AI 可以很快把“代码块”写出来，但一个库能不能真的像库一样被别人使用，仍然取决于你有没有把入口、边界和验证方式想清楚。
