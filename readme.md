# 无刷新跨域传输数据

`window.name` 网上的文章有很多，[这里是一篇简短的实现说明](http://www.cnblogs.com/rainman/archive/2011/02/21/1960044.html)。基本原理是 `window.name` 可以在 `location` 改变后保持不变。

## API

```javascript
var t = new Transfer(url, callback(data), options); // create instance
t.send();   // post
```

`options` 参数是一个可选的配置项，可对 `params` , `files` 和 `localProxy` 进行配置。

- `params` 是一个简单的 JSON 对象，用来存放需要 post 的数据。
- `files` 一个数组，用来提交指定的 `input[type="file"]` 元素
- `localProxy` 是用来做 post 跨域处理的当前域名的代理页面，默认是 `/favicon.ico`。

对于实例化后的对象，可供修改使用的属性有：

- `params` 一个 JSON 对象，可用来修改增加和删除待提交的数据
- `files` 一个数组，可用来增减待提交的 `input[type="file"]` 元素

对于 `params` 属性，可以用数组来表示像 `input[type="checkbox"]`  这种使用多值的情况，如：

```javascript
var t = new Transfer(url, function(data) {
    },
    {
        params: {
            a: [1, 2, 3]
        }
    }
);
```

上面的代码实际提交的会是：

```
a[] = 1
a[] = 2
a[] = 3
```

## 使用

```javascript
var t = new Transfer('http://127.0.0.1/action.php', function(data) {
        console.log(data);
    },
    {
        params: {
            key: 'happy',
            // multiple value with the same name like checkbox
            checks: [1, 2, 3]
        },
        files: [fileElement1, fileElement2]
    }
);
```

上面会发出一个 `post` 请求，自动添加 `windownname=1` 这个参数，然后接口在收到请求并确定采用 windowname 跨域时，返回的数据应像下面这样。

```html
<script>
window.name = "the response";
</script>
```
`window.name` 被赋予的值是一个字符串，字符串的表现形式随意，比如 JSON 形式：`window.name="{\"status\": 1}";`，例子可参考 [demo.html](demo.html)。
