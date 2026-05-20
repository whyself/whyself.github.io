---
title: "Cangjie01-环境配置"
excerpt: "记录在 Ubuntu 24.04 上安装仓颉工具链、配置 VS Code 插件，以及让仓颉项目获得完整补全的过程。"
publishDate: 2026-04-17
listDate: "Apr 17, 2026"
wordCount: "280 Words"
tags:
  - 仓颉
  - 笔记
majorCategory: Articles
thumbnail: "/images/posts/cangjie-environment/cangjie-logo.svg"
draft: false
---

我努力在学习 Cangjie 语言的时候弥补我的 Linux 命令行知识以及编程语言基础知识……

# 安装工具链

我使用的是 Ubuntu24.04 需要安装以下依赖：

```bash
sudo apt update
sudo apt install -y binutils libc6-dev libc++-dev gcc g++ libstdc++6 openssl libssl3t64
```

完成之后，我去官网下载了 Cangjie 1.1.0-beta.25

下载之后一般可以解压到 `/home/<user_name>/opt`

```bash
mkdir -p ~/opt
cd ~/opt
tar xvf ~/Downloads/cangjie-sdk-linux-x64-*.tar.gz
```

当然如果你想像我装到 `/opt` 的系统级目录里用 `sudo` 搞来搞去也可以（）

启动环境配置脚本，输出版本号就安装好了

```bash
source ~/opt/cangjie/envsetup.sh
cjc -v
cjpm -v
```

要让以后每次开终端都自动生效，把这一行加到 ~/.bashrc 最后，然后立即重新读取并执行 Bash 配置文件：

```bash
echo 'source ~/opt/cangjie/envsetup.sh' >> ~/.bashrc
source ~/.bashrc
```

然后在 vscode 里新装一下官方的插件：

![VS Code 中的仓颉扩展](\/images\/posts\/cangjie-environment\/extension.png)

顺便在 vscode settings.json (/home/why/.config/Code/User/settings.json) 里补上：

```json
"CangjieSdk.Option": "CJNative",
"CangjieSdkPath.CJNativeBackend": "/opt/cangjie"
```

给插件调用

# 配置项目启动完整补全

写完代码了发现仓颉只有一些关键字补全，然后才知道，不是仓颉项目文件没有完整的补全，于是大刀阔斧改了项目结构

```
leetcode_cj/
|-- .gitignore
|-- cjpm.toml // 项目配置文件
|-- cjpm.lock // 依赖锁定文件
|-- README.md
|-- src/
|   |-- main.cj // 项目主入口负责启动各个代码
|   |-- hello.cj
|   |-- addTwoNumbers/
|   |   `-- Solution.cj
|   |-- twoSum/
|   |   `-- Solution.cj
|   `-- twoSumHash/
|       `-- Solution.cj
|-- notes/ // 笔记
|   |-- CJLearning01.md
|   |-- extension.png
|-- skill/ // 本地仓颉文档 skill
|   `-- cangjielearning/
|       `-- SKILL.md
```

对于 main.cj：

```
package leetcode_cj

import leetcode_cj.twoSum
import leetcode_cj.twoSumHash

main(): Int64 {
    printHello()

    let nums = [2, 7, 11, 15]
    let target = 9

    let brute = twoSum.Solution()
    let hash = twoSumHash.Solution()
    println(brute.twoSum(nums, target))
    println(hash.twoSum(nums, target))
    return 0
}
```

`package xxx` 与项目文件 `cjpm.toml` 里的名字保持一致，类似于 C 语言的 `namespace`，是该项目的 root 包名

对于题目子包里的 `Solution.cj`：

```
package leetcode_cj.twoSumHash

import std.collection.*

public class Solution {
    public func twoSum(nums: Array<Int64>, target: Int64): Array<Int64> {
        let len = nums.size
        var mp = HashMap<Int64, Int64>()
        
        if (len < 2) {
            return []
        }
        for (i in 0..len) {
            if (mp.contains(target - nums[i])) {
                return [mp[target - nums[i]], i]
            }
            mp[nums[i]] = i
        }
        return []
    }
}
```

`public` 声明让外部 `main.cj` 可以调用，具体来说：

- private：仅类型/当前定义内部可见
- internal（默认）：当前包及子包可见
- protected：当前模块可见（并有继承相关规则）
- public：模块内外都可见
