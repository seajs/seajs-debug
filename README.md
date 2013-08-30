# seajs-debug


A Sea.js plugin for debugging freely


## Install

Install with spm:

    $ spm install seajs/seajs-debug


## Usage

1. Set alias config first:

  ```js
  seajs.config({
      "alias": {
        "seajs-debug": "path/to/seajs-debug"
      }
  })
  ```

2. Add `?seajs-debug` to page uri and reload it, then You will see a float box.

For more details please visit [中文文档](https://github.com/seajs/seajs-debug/issues/4)



### 按钮

1. Debug 开启表示载入未压缩的代码, 关闭表示载入压缩后的代码

2. Combo 当页面有 seajs-combo 下, 默认是会 combo url 的. 开启此开关表示强制不 combo url

3. Cache 开启表示禁用缓存, 默认在模块 url 后加上一个时间戳

4. Log 开启表示载入 seajs-log, 以显示代码中的 seajs.log 信息

5. Mode 两种编辑模式, 默认是映射模式.

    - 映射模式:
        类似于 fiddle 的映射功能, 输入源地址和目标地址, 保存之后,
        会在下次页面刷新后载入模块时, 自动匹配源地址. 如果匹配到, 将去请求对应的目标地址,
        同时, 对应的输入框高亮显示以提示哪些是有用的映射.

        注意: 匹配时是针对原始的模块 url, 而不是调用 seajs-debug 后被转换的 url

    - 编辑模式:
        可在输入框中输入一个 Object 对象, 保存之后,
        会在下次页面刷新后将此对象作为 seajs.config() 参数传入, 进行自定义配置

6. Health 开启载入 seajs-health, 并显示 seajs-health 的相关内容

注意: 面板上的各种状态信息会存储在本地存储中, 所以不用担心刷新之后会丢失之前输入的信息