# 深入理解Vue SSR服务端渲染的“爱恨情仇”
致力于介绍VueSSR整体过程

## 前言

其实总结这篇关于`Vue SSR`整体流程的文章已经算是一年前的任务了，还记得当时在准备面试的时候，似乎“八股文”多有出现关于服务端渲染整体流程的问题，为了能在面试中不被疯狂嘲讽😭，笔者当时还是花了点时间好好研究了下如果实现一个`Vue SSR`的过程。

当然这个过程中并不顺利，可能是笔者当时水平有限，在查阅官方文档时，对于官方文档中描述的种种概念不太能理解，于是乎我打开了百度，扑面而来的文章数不胜数，然而在我打开了多个博客然后又退出来之后，发现很多都是水文，几乎没有提供有价值的、整体性的分析。即便是有大神也进行了相关内容的撰写，但理解起来也不是那么容易，所以在笔者“边哭边学”终于弄懂一二之后，决心一定要自己好好总结一篇完整的文章，巩固自身对这方面知识的理解，并也希望能够给存在相似经历的读者带来一点启发和帮助。

> 如果读完之后觉得有所收获，也希望能给笔者一个赞呀😘

## 概念

在进入本文进行详细分析之前，我们需要理解以下几个概念：
- `CSR` - 客户端渲染
- `Prerender` - 预渲染
- `SSR` - 服务端渲染

> 渲染：将数据和模版组装成`html`

### CSR-客户端渲染
顾名思义，客户端渲染即是由浏览器来负责全部的渲染工作，采用`ajax`进行异步数据的获取。对于我们传统的`SPA`（单页应用）来说，我们如果不去进行一些额外的工作，那么它默认就是采用客户端渲染。

也就是说服务端仅提供接口和静态资源，对于客户端渲染的应用来说，在用户初次访问网页的时候，会经历以下过程：

[![CSR](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c9648b946a7546ed957d8cf1142c43d3~tplv-k3u1fbpfcp-zoom-1.image)](https://imgchr.com/i/sRDjmt)

刚开始渲染的页面内容是空的，它需要执行`JS`文件来进行页面的元素的创建和插入，并进行重新渲染，如果说该`JS`文件过大，在请求该文件的过程中，我们看的页面就是空白的，所以对于`SPA`应用来说，我们经常需要面临的问题就是，如何减少首页白屏时间，这也就牵扯到我们各种前端性能优化相关的内容了。

正所谓有利必有弊，福祸相依，那么对于客户端渲染来说，它又有哪些优缺点呢。这里将有笔者为你娓娓道来。

#### 优点
- 首次加载完之后，页面响应速度快。
- 前后端分离。
- 可以进行各种组件服用以及懒加载等能力。
- 结构清晰，无需与服务端各项逻辑进行耦合，开发体验友好。
- 前端技术栈可以更加丰富，无需被各种模板引擎所束缚。

#### 缺点
- 不利于`SEO`。
- 首页性能差，容易白屏。

针对于客户端渲染的这些问题来说，我们可以预见性的发现它更适合公司内部的管理后台或者其他不需要考虑`SEO`和首屏加载速度的场景下。

当然为了解决以上两大让人头疼的问题，我们就有了以下的方案：预渲染和服务端渲染。

### Prerender-预渲染

即利用打包工具对应用进行预先渲染，让用户在首次获取到`HTML`文件的时候就已经能看到我们的内容，接着等待`Bundle`下载解析完成之后再进行接管。

那么我们在打包构建预渲染的核心原理又是什么呢？其实这里就要用到我们十分强大的无头浏览器来帮助实现这项功能了，他会在本地启动一个无头浏览器，并访问我们配置好的路由，接着将渲染好的页面`HTML`内容输出到我们的`HTML`文件中，并建立相关的目录，也就是我们上述所看到的结构。

我们一般常用的无头例如有：`phantomjs`，`puppeteer`，对于`prerender-spa-plugin`插件来说，他内部就是采用了`phantomjs`作为无头浏览器进行预渲染。

[![pre-render](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f023e4e2d13740f8b099988488f90e49~tplv-k3u1fbpfcp-zoom-1.image)](https://imgchr.com/i/sRDgSJ)
#### 优点

- `SEO` - 对于搜索引擎爬虫来说（先排除高级爬虫），它不会等待你的`JS`执行完成之后才进行抓取，如果不进行预渲染，对于客户端渲染应用来说，`HTML`文件中几乎没有什么内容，故会影响你的搜索排名。采用预渲染就能保证在首次加载就能获取到相关的`HTML`内容，利于`SEO`。
- 弱网环境：对于网络条件较差的用户来说，你的`Bundle`文件过大，会导致页面长时间白屏，这将使你白白流失很多用户，所以首次内容的快速呈现也是十分重要的，解决首页白屏问题。
- 兼容浏览器差异：对于部分浏览器（点谁心里有数啊QAQ）来说，有些高级特性是不支持的，这个时候如果在执行`JS`的过程中异常将可能存在浏览器页面显示异常的情况，这个时候预渲染的能力也是能兼容这种情况的。

那么我们又该如何进行预渲染呢？

这里就直接以`Webpack`为例，我们可以直接使用它的预渲染插件：`prerender-spa-plugin`。

我们直接使用该插件的时候可以配置需要预渲染的路由：

> 默认情况下 `HTML` 会在脚本执行完被捕获并输出。你也可以指定一些钩子，`HTML` 将会在特定时机被捕获。

```js
var path = require('path')
var PrerenderSpaPlugin = require('prerender-spa-plugin')
{
  //...
  plugins: [
    new PrerenderSpaPlugin({
      path.resolve(__dirname, './dist'),
      ['/home', '/foo'],
      {
        // 监听到自定事件时捕获
        // document.dispatchEvent(new Event('custom-post-render-event'))
        captureAfterDocumentEvent: 'custom-post-render-event',

        // 查询到指定元素时捕获
        captureAfterElementExists: '#content',

        // 定时捕获
        captureAfterTime: 5000
      }
    })
  ]
}
```

这样配置完之后我们就能在我们的`dist`目录中找到相关路由的预渲染`HTML`文件啦。

```powershell
dist
│  index.html
│
├─home
│  index.html
│
├─foo
│  index.html

```

从宏观角度上看，是不是也是十分便捷呢，这样我们一些需要进行预先渲染的页面就能具备预渲染能力了。

#### 缺点
也正是因为预渲染的构建是由打包工具在打包的时候就渲染出来了，所以如果不重新构建，那么用户所看到的预渲染页面永远都是一成不变的，即便你的页面数据早已更新，但是初次渲染的时候，浏览器展示的依旧是这套老旧的数据，如果想要看到最新的数据就需要等待`JS`下载完毕重新渲染的时候才能出现，从而是用户感觉很突兀的感觉。

由于需要借助打包工具的力量，所以我们需要增加一些配置成本，不仅如此，在进行预渲染时，也同样会拉长打包的总时间，使我们每次构建的速度大大降低，这是十分糟糕的开发体验。

### SSR-服务端渲染
服务端渲染的方式其实就好比我们以前使用`jsp`等技术直接在服务端借助模板引擎直接渲染出`HTML`文档返回给客户端，对于一些小型项目而言，这种方式无疑是比较节约人力成本的，但不得不说这种开发方式十分不友好。

不同于预渲染方式，服务端渲染的好处在于，客户端在初次获取到页面时看到的就已经是最新的数据渲染出来的页面了，服务端会预先获取到需要渲染的数据，并组装成完整的页面返回给客户端，这种方式无疑就比预渲染数据延迟的模式友好得多。

对于我们目前主流的前端框架来说：`Vue`、`React`，都已支持了服务端渲染，只不过相对于纯`SPA`页面开发来说，研发成本也相应的有所提高，我们需要考虑许多兼容情况。如果使用过这两大框架的童鞋可能就会接触到虚拟`DOM`这个概念，在实现上，他们其实也就是一个个`JS`对象，我们在前端一般操作`DOM`的方式都是在操作虚拟`DOM`，也正是因为有虚拟`DOM`，我们才能方便的实现`SSR`。

我们在浏览器端操作虚拟`DOM`对应的是操作真实的`DOM`元素，而在进行服务端渲染时，`Node`端操作虚拟`DOM`实际上是在操作字符串。

[![ssr.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5e43856fecc54daa8a6e4a29bc93fa1f~tplv-k3u1fbpfcp-zoom-1.image)](https://imgchr.com/i/sfU2OP)

#### 优点

- 用户看到完整页面的速度快，因为不需要客户端重新进行渲染，在服务端已经把当前页面渲染完毕了。
- 利于`SEO`，爬虫在抓取我们页面内容的时候就已经能获取到一个渲染好的页面了，所以能轻松获取到网站的关键信息。
- 节省客户端资源，不需要客户端进行渲染操作，对于移动端用户来说，耗电量减少。
- 可以利用缓存机制，将一些页面进行缓存，进一步提高响应速度。
- 数据实时性。
- 无需关注浏览器兼容问题。

#### 缺点

- 服务器资源占用，使用服务端渲染，其实也就是把本该在客户端渲染的工作转交给了服务端，这在大流量场景下必然会给服务器带来一定压力。
- 开发成本提高，对于开发者而言我们需要兼顾两端的兼容性，比如`DOM`的操作，在服务端是不存在`DOM`的。

### 同构的概念
[![同构.jpg](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/59aa4c29683a47db9f40df530f46a1a9~tplv-k3u1fbpfcp-zoom-1.image)](https://imgchr.com/i/sfaq9H)

在`React`、`Vue`中，我们或许经常能听到同构这样的词汇，那么何为同构呢？

其实就是客户端与服务端进行配合，将代码在客户端与服务端各跑一次，服务端仅负责初次页面的渲染工作，而其他页面的渲染就转交给客户端`SPA`进行控制，这样不仅能减轻服务端的压力，也能在一定程度上有利于前后端分离，提高我们的开发体验。

#### Hydrate

在这个过程当中，一般服务端渲染完初始页的内容之后，会有一个`Hydrate`的过程，在客户端会创建出对应的虚拟`DOM`并与服务端渲染的`DOM`进行比对，如果匹配，那么客户端将直接接管服务端渲染好的页面，如果不匹配，那么客户端就会重新生成新的真实`DOM`，然后抛弃服务端渲染出来的`DOM`，这也将造成性能损耗，所以在代码编写中应该避免一些浏览器机制导致的坑。

> 浏览器会在 `<table>` 内部自动注入 `<tbody>`，然而，由于 Vue 生成的虚拟 DOM (virtual DOM) 不包含 `<tbody>`，所以会导致无法匹配。为能够正确匹配，请确保在模板中写入有效的 HTML。

## Vue SSR原理概览

![Vue-SSR](https://cloud.githubusercontent.com/assets/499550/17607895/786a415a-5fee-11e6-9c11-45a2cfdf085c.png)

这里我们从官网给出来的一张整体流程图来分析，我们可以发现我们的业务代码将由`app.js`作为入口，并且需要配合`webpack`进行打包，同时我们的项目需要提供两套`webpack`配置，分别为服务端构建配置和客户端构建的配置。

通过这个过程打包完毕之后我们就能拿到两个`Bundle`，服务端`Bundle`将由服务器（`Node.js`）进行服务端渲染，并将渲染好的结果返回给客户端，同时会有一个`Hydrate`（注水）的过程，将我们服务端渲染好的`HTML`与客户端代码进行混合，接着由客户端接管页面的渲染，正如前面所说，这个注水的过程我们也需要注意规避一些不必要的坑。

不仅如此，我们从图中可以看到，服务端构建配置的`entry`与客户端构建配置的`entry`都引入了同一个`app.js`，所以这就是我们前面为什么提到我们的代码需要考虑两端的兼容问题，同一份代码将会执行在两个不同的环境中。

> 这里也不要被这个图吓到，本质上其实概念不多，如果说想要配置一个简易的`SSR`应该还是不难的。

## 快速上手
在经过了一轮相关理论的毒打之后，我们就要准备自己动手来给我们的应用披上服务端渲染的雍容新衣了。这里将会逐步带你由浅入深来剖析如何实现一个`SSR`，并逐步提高我们构建的项目所能适应的应用场景。

> 任何只提概念不提实践的`SSR`之类文章都是在耍流氓。

### 阅读建议

- `node.js`基础
- 了解`express`搭建简单服务
- 了解`Vue`。

### 编写一段简单的Vue相关代码

我们这里结合实际代码来研究会比较好理解一些：

```js
const Vue = require('vue');
const app = new Vue({
    template: '<div>{{text}}</div>',
    data() {
      return {
        text: '这里是服务端渲染Demo'
      }
    }
});
```

> 这里是用`node`配合`express`搭建了一个简易的`node`服务。

这里首先引入了`Vue`，并实例化了一个`Vue`实例，该实例上挂载了一个简单的模板内容，也就是一个`template`，并使用了`Vue`的插值表达式给模板中`div`中插入了一段文字，这里的内容从`data`对象中拿到，相信写过`Vue`的小伙伴应该也会十分眼熟，这里就不过多赘述了。

### 启动一个服务

```js
const server = express();
server.listen(3000, () => {
    console.log(
        'App runing at:',
        `Local: ${ chalk.blueBright.underline('http://localhost:3000') }`
    )
});
```

接下来笔者这里利用`express`启动了一个服务，并绑定在3000端口，方便我们直接访问服务就能获取到内容。
> 这里笔者用了`chalk`库对我们控制台打印的结果修饰了一下，去掉也无伤大雅，直接`console.log()`就行。

做完这些我们就需要思考下一个点了，服务也写好了，`Vue`相关代码也写好了，我们怎么把内容渲染给客户端呢？

### 渲染Vue实例
这个时候就要用到我们官方提供的第三方包`vue-server-renderer`，顾名思义，就是专门用来做`Vue`服务端渲染的。首先我们先拿到它导出的方法`createRenderer`，并调用该方法，获得一个`renderer`，接着我们就可以给服务写一个中间件来拦截请求并返回给客户端了。

```js
const { createRenderer } = require('vue-server-renderer');
const renderer = createRenderer();
server.use((req, res) => {
    renderer.renderToString(app, (err, html) => {
        if (err) throw err;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
    })
})
```
我们这里调用`renderer`上的`renderToString`方法，并将我们的`Vue`实例作为第一个参数传入，同时编写一个回调，用来接收渲染好的`HTML`字符串，这样我们就可以在该回调用拿到渲染好的字符串并发送给客户端了。

> 这里记得给响应加上头信息，不然客户端接收到的可能就是乱码。

同时，这里的`renderToString`也可以换成`renderToStream`，采用流式渲染，具体用法这里直接贴出官方给的方式，就不过多介绍了。
```js
const stream = renderer.renderToStream(context)

let html = ''

stream.on('data', data => {
  html += data.toString()
})

stream.on('end', () => {
  console.log(html) // 渲染完成
})

stream.on('error', err => {
  // handle error...
})
```
在流式渲染模式下，当 `renderer` 遍历虚拟 `DOM` 树 (`virtual DOM tree`) 时，会尽快发送数据。这意味着我们可以尽快获得"第一个 `chunk`"，并开始更快地将其发送给客户端。

然而，当第一个数据 `chunk` 被发出时，子组件甚至可能不被实例化，它们的生命周期钩子也不会被调用。这意味着，如果子组件需要在其生命周期钩子函数中，将数据附加到渲染上下文 (`render context`)，当流 (`stream`) 启动时，这些数据将不可用。这是因为，大量上下文信息 (`context information`)（如头信息 (`head information`) 或内联关键 `CSS(inline critical CSS`)）需要在应用程序标记 (`markup`) 之前出现，我们基本上必须等待流(`stream`)完成后，才能开始使用这些上下文数据。

因此，如果你依赖由组件生命周期钩子函数填充的上下文数据，则不建议使用流式传输模式。

上面官方的解释已经挺详细了，这里笔者再多提一嘴，流式传输可以用在一些静态页面，不依赖生命周期函数进行数据填充的场景，这种场景下，我们可以尽可能的让用户早点看到内容，而不影响原有渲染流程。

### 完整代码

```js
const { createRenderer } = require('vue-server-renderer');
const express = require('express');
const chalk = require('chalk')
const Vue = require('vue');

const app = new Vue({
    template: '<div>{{text}}</div>',
    data() {
      return {
        text: '这里是服务端渲染Demo'
      }
    }
});

const renderer = createRenderer();
const server = express();
server.use((req, res) => {
    renderer.renderToString(app, (err, html) => {
        if (err) throw err;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
    })
})

server.listen(3000, () => {
    console.log(
        'App runing at:',
        `Local: ${ chalk.blueBright.underline('http://localhost:3000') }`
    )
});
```

效果：

[![简易SSR.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b5801f4da3cc4b40b9422e7d857ebaee~tplv-k3u1fbpfcp-zoom-1.image)](https://imgchr.com/i/sHXB0f)

这里我们实现了一个简单的服务端渲染示例，启动服务之后我们就能访问对应端口查看渲染结果了。

## Vue项目添加SSR
前面我们介绍完怎么将一个简单的`Vue`实例进行渲染给客户端之后，接下来我们要继续深入了，毕竟我们实际项目中，应该不存在单纯这么简单的业务代码吧。

### 涉及技术栈
- `node.js`
- `Vue`
- `express`
- `webpack`

### 整体架构

[![vue-ssr流程.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7a9d6923d3c541e1bd0d0a65b34d2b87~tplv-k3u1fbpfcp-zoom-1.image)](https://imgchr.com/i/yluEiF)

### 准备工作

在正式开始介绍如何配合现有`Vue`项目实现`SSR`之前，我们先初始化一个简易的`Vue`项目。你可以使用`Vue-cli`创建一个简易项目，也可以跟着笔者直接自己借鉴官方项目结构创建一个简单的项目。

当然也可直接`clone`笔者的演示项目（建议）：[项目地址](https://github.com/STDSuperman/VueSSR-Lesson)

#### 项目目录

首先新建一个文件夹，作为我们整个项目的根目录，接着在命令行中输入`npm init -y`，初始化`npm`，然后按照按照如下目录结构创建对应的文件，创建时我们先不用关心各个文件中内容是什么，后面将分逐一进行讲解。

```powershell
├─.babelrc
├─entry-client.js
├─entry-server.js
├─index.html
├─package.json
├─server.js
├─src
|  ├─app.js
|  ├─App.vue
|  ├─store
|  |   ├─actions.js
|  |   ├─index.js
|  |   └mutations.js
|  ├─router
|  |   └index.js
|  ├─components
|  |     ├─Foo.vue
|  |     └Home.vue
├─build
|   ├─webpack.base.config.js
|   ├─webpack.client.config.js
|   └webpack.server.config.js
```

### 前端部分
这里主要写了两个页面，一个首页一个额外的页面，内容也很简单，主要为了演示路由。

首页部分，笔者这里定义了一个`asyncData`，用于暴露给服务端渲染时预取数据。

```html
<template>
    <div class=''>
        <h1>{{title}}</h1>
        这里是Home
    </div>
</template>

<script>

import { mapGetters } from 'vuex';
import * as actions from '@/store/actions';

export default {
    name: 'Home',
    computed: {
        ...mapGetters([
            'title'
        ])
    },
    asyncData({store}) {
        return store.dispatch({
            type: actions.FETCH_TITLE
        })
    }
}
```

笔者在这个`asyncData`函数中分发了一个`action`用于异步获取数据，该函数只会在服务端执行，在服务端渲染的时候会去调用这个函数预取数据，我们可以大概看一下这个异步`action`具体实现：

```js
import * as mutations from './mutations';

export const FETCH_TITLE = 'FETCH_TITLE'

export default {
    [FETCH_TITLE]({commit}) {
        return new Promise(resolve => {
            setTimeout(() => {
                commit(mutations.SET_TITLE, '这里是服务端渲染的title')
                resolve();
            }, 3000)
        })
    }
}
```

这里直接就用延时函数延时了三秒模拟异步请求，所以我们要等三秒之后才能看到页面中出现`这里是服务端渲染的title`。当然也是因为这个因素，在进行服务端渲染的时候，我们访问页面首页路由的时候需要等待三秒，服务器才会响应页面，因为它需要做数据预取操作，这个过程完成之后才能渲染出完整页面。

> 也就是说如果你想要设定一些预取得数据，你可以定义一个`asyncData`用于满足需求。具体服务端渲染配合实现请接着往下看。

### webpack配置

如果想要对一个完整的`Vue`项目添加`SSR`，我们需要先对它进行打包，然后将结果作为我们服务器提供`SSR`服务的依赖文件。

我们可以注意到，在上述的文件目录中，有一个`build`，目录，它就是用来放置我们的`webpack`相关配置的。这里我们可以再回过头回想一下前面放出来的官方`SSR`整体的流程图，我们可以清晰的知道，我们在在配置`webpack`客户端与服务端相关配置文件时，同时也需要创建对应的入口文件，也就上上述目录中的`entry-client.js`与`entry-server.js`。

#### entry-client.js
客户端入口文件。

```js
import createApp from '@/app.js';

const { app, store } = createApp();

if (window.__INITIAL_STATE__) {
    store.replaceState(window.__INITIAL_STATE__)
}

app.$mount('#app');
```

> 这里导入的地方笔者用了`@`，这个是笔者配置了`webpack`的别名，相当于根目录下`src`目录，主要为了省略一点路径，也不用一层层找了。

从整体代码来看，笔者这里写的也比较简单了，主要功能就是挂载`Vue`实例（`$mount`），在整个渲染过程中也叫做客户端激活，同时将服务端预取的数据保存到`Vuex`中，这个过程主要通过调用`replaceState`方式，将服务端挂载在 `window`上的`__INITIAL_STATE__`替换 `store` 的根状态。

这里的`createApp`方法主要用于创建一个新的`Vue`实例，并可以获取到挂载到`Vue`实例上的`VueRouter`或`Vuex`实例对象，根据我们需要，去做一些初始化的操作。

> 这里说明一下为什么需要把这个操作抽离成一个单独的函数，因为对于服务端而言，如果不对每个用户创建一个全新的实例，那么就会出现多个请求共享一个实例的情况，这个时候就会很容易导致交叉请求状态污染，所以我们需要对每个请求创建一个新的实例。

##### createApp

如果你是通过脚手架工具创建了一个新的项目，那么你需要将原有的`src`目录下的`index.js`改为`app.js`，并暴露一个`createApp`方法。
```js
import Vue from 'vue';
import App from './App'
import VueRouter from 'vue-router';
import routes from './router'
import Vuex from 'vuex';
import storeConfig from './store';

Vue.use(VueRouter);
Vue.use(Vuex);

const store = new Vuex.Store(storeConfig);
const router = new VueRouter({
    routes,
    mode: 'history'
})

export default function createApp() {
    const app = new Vue({
        router,
        store,
        render: h => h(App)
    })
    return { app, router, store }
}
```

从结构上看，和我们之前在普通`Vue`项目中`index.js`文件里编写的相关逻辑差别不大，都是进行根实例初始化的一些操作，唯一的区别是将原来直接`new Vue(...)`这部分逻辑转移到`createApp`这个函数当中提供给外部调用，用于产生新的实例，返回创建好的`Vue`实例和`VueRouter`、`Vuex`实例等。

#### entry-server.js
服务端入口文件。
```js
import createApp from '@/app.js';

export default context => {
    return new Promise((resolve, reject) => {
        const { app, router, store } = createApp();
        router.push(context.url);
        router.onReady(() => {
            const matchedComponents = router.getMatchedComponents();
            if (!matchedComponents.length) reject({code: 404});

            Promise.all(matchedComponents.map(component => {
                return component.asyncData && component.asyncData({store, route: router.currentRoute})
            })).then(() => {
                context.state = store.state;
                resolve(app);
            }).catch(reject);
        }, reject)
    })
}
```

同样我们需要调用`createApp`获取我们需要的实例对象，同时导出一个方法供服务端调用，并且该方法返回一个`Promise`，因为我们需要执行一些异步操作，比如预取数据等操作。

方法接收一个`context`参数，这里笔者主要用于获取当前请求的路由路径，并调用`router`实例的`push`方法，将路由置为用户当前请求的路由路径，同时，当路由跳转准备好之后，进行路由组件的匹配，获取到该路由下需要用到的组件列表，如果没有匹配到则直接返回`404`，否则遍历所有组件，调用组件的`asyncData`方法，把需要进行预取得数据准备好。

当所有组件的数据准备完毕之后，将当前`store.state`挂载到`context`的`state`属性上，以便于在渲染模板时，在模板中添加一个`script`标签，内容为：`window.__INITIAL_STATE__= xxx `，这里的`xxx`就是我们的`store.state`，这样我们就能在客户端入口文件中通过这个`window`上的属性，初始化客户端的`state`。

也就是我们上面`entry-client.js`中调用`replaceState`部分要用到的数据。

#### webpack.base.config.js
对于我们整个项目来说，服务端`webpack`配置与客户端`webpack`配置也会存在一些公共配置，所以我们可以将共有部分抽出来，作为基础配置，最后合并到特定端的配置中。

来看看都有啥：

```js

const VueLoaderPlugin = require('vue-loader/lib/plugin');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack')

module.exports = {
    mode: 'development',
    module: {
        rules: [
            { test: /\.js$/, loader: 'babel-loader' },
            { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
            { test: /\.scss$/, loader: 'sass-loader' },
            { test: /\.vue$/, loader: 'vue-loader' },
        ]
    },
    output: {
        path: path.resolve(__dirname, '../dist')
    },
    plugins: [
        new VueLoaderPlugin(),
        new MiniCssExtractPlugin({
            filename: 'css/[name].[contenthash:8].css'
        }),
        new webpack.NoEmitOnErrorsPlugin()
    ],
    stats: {
        logging: 'none'
    },
    resolve: {
        extensions: ['.vue', '.ts', '.js'],
        alias: {
            '@': path.resolve(__dirname, '../src')
        }
    }
}
```

> 这里对每个参数的含义就不进行过多介绍了，对于`webpack`配置项不太了解的可以参考相关中文文档。传送门：[webpack中文网](https://www.webpackjs.com/concepts/)

##### loader

这里主要用到了几个`loader`，分别是：

- `babel-loader`：用来转换高级语法为低级语法，这里相关的配置笔者就将它写到`.babelrc`文件中了，参见上述目录结构。
  - 具体内容如下：
    - ```json
        {
            "presets": ["@babel/preset-env"],
            "plugins": ["@babel/plugin-syntax-dynamic-import"]
        }
        ```
- `MiniCssExtractPlugin.loader`与`css-loader`：处理`css`相关内容（具体用法见官方文档）。
- `sass-loader`：笔者在项目中比较喜欢使用`scss`，所以这里添加了对`scss`的处理。
- `vue-loader`：对于`Vue`项目来说，这个`loader`应该还是很重要的吧，用来处理`.vue`文件。

##### plugins

- `VueLoaderPlugin`：必须的插件， 它的职责是将你定义过的其它规则复制并应用到 `.vue` 文件里相应语言的块。例如，如果你有一条匹配 `/\.js$/` 的规则，那么它会应用到 .vue 文件里的 `<script>` 块。
- `MiniCssExtractPlugin`：将 `CSS` 提取到单独的文件中，为每个包含 `CSS` 的 `JS` 文件创建一个 `CSS` 文件，并且支持 `CSS` 和 `SourceMaps` 的按需加载。
- `NoEmitOnErrorsPlugin`：在编译出现错误时，使用 `NoEmitOnErrorsPlugin` 来跳过输出阶段。

##### 安装相关依赖

笔者比较喜爱使用`yarn`进行包安装，你也可以采用`npm`或`cnpm`，只需要将下面的`yarn add `改成`npm i`即可。

```shell
yarn add vue-loader babel-loader mini-css-extract-plugin webpack@4 webpack-cli sass-loader @babel/preset-env @babel/plugin-syntax-dynamic-import vue-template-compiler css-loader -D
```

> 这里还是建议搭建直接克隆笔者的项目比较方便，万一依赖项笔者漏写了，估计你们要锤死我。

#### webpack.client.config.js

客户端构建相关配置项：

```js
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');
const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');
const path = require('path')
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require('webpack')

module.exports = webpackMerge.merge(baseConfig, {
    entry: path.resolve(__dirname, '../entry-client.js'),
    optimization: {
        splitChunks: {
            cacheGroups: {
                common: {
                    minChunks: 2,
                    priority: -10,
                    reuseExistingChunk: true
                }
            }
        },
        minimize: true,
        minimizer: [new TerserPlugin()]
    },
    plugins: [
        new VueSSRClientPlugin()
    ]
})
```

##### plugins
这里基于基础配置上，添加了热替换的插件和`Vue SSR`客户端构建插件，上面`entry`部分的写法是为了给我们的项目添加热更新能力，这里主要需要配合`webpack-hot-middleware`进行实现，具体配置方式可以参考官方文档：[传送门](https://github.com/webpack-contrib/webpack-hot-middleware#readme)。

这里笔者也配置了一下代码分割，将公共代码进行抽离，并改用`terser-webpack-plugin`对代码进行压缩（`webpack5`之后内置的，这里采用`webpack4`作为演示）。

##### 安装依赖
在安装完基础配置文件的依赖后，客户端相关配置也需要进行依赖安装：

```shell
yarn add webpack-merge terser-webpack-plugin webpack-hot-middleware -D
```

#### webpack.server.config.js

同理，这里是服务端相关配置。

```js
const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');
const path = require('path');
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')
const nodeExternals = require('webpack-node-externals')

module.exports = webpackMerge.merge(baseConfig, {
    entry: path.resolve(__dirname, '../entry-server.js'),
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: 'server-bundle.js',
        libraryTarget: 'commonjs2'
    },
    target: 'node',
    externals: nodeExternals({
        allowlist: [/\.css$/]
    }),
    devtool: 'source-map',
    plugins: [new VueSSRServerPlugin()]
})
```

对于服务端相关配置来说，我们这里就不需要配置热更新相关了，所以这里只用到了一个官方提供用来构建服务端配置的插件`server-plugin`，然后我们这里配置了`externals`，对于服务端来说，它无法处理`css`相关逻辑，所以我们这里直接给他忽略一下。同时，这里还有一个注意点，我们需要把构建的目标改成`node`，也就是设置`target: 'node'`，不仅如此，这里还需要配置`libraryTarget: 'commonjs2'`，以便我们在`node`端进行导入。

##### 安装依赖

```shell
yarn add webpack-node-externals -D
```
这里就新增了一个依赖项。

好了，介绍完`webpack`配置相关之后，我们就可以分别构建出服务端需要的结果和客户端相关的结果了，离成功又近了一步。

##### 执行打包构建

这里推荐将构建命令写入到`package.json`文件中，笔者这里将执行两端代码构建命令浓缩成一句：

```json
"scripts": {
  "build": "npm run build:client & npm run build:server",
  "build:server": "webpack --config ./build/webpack.server.config.js",
  "build:client": "webpack --config ./build/webpack.client.config.js"
}
```

这样在`package.json`配置好之后，我们就可以直接执行一个命令就可以启动构建流程了：

```shell
npm run build
```

## 服务端搭建

在讲解完`webpack`相关配置的编写之后，我们就需要搭建我们用于提供渲染能力的服务端代码了。

### Server端

这里我们在上代码之前，我们先需要理一理思路，先回顾一下我们前面实现的一个小型的服务端渲染过程，也就是直接在服务端代码中`new`一个`Vue`实例，接着调用`createBundleRenderer`创建一个`renderer`，然后使用`renderer.renderToString`方法进行渲染，所以，整体流程大致为：

1. 获取实例。
2. 创建`renderer`。
3. 执行渲染。
4. 返回给客户端。

就以上流程而言，我们这里的方式其实差不多，只不过在各步骤中需要做一些额外的操作。

> 以下服务端代码文件位于`VueSSR-Lesson`项目下`lessons`目录
#### 获取项目代码
```js
// lesson2.js
let clientManifest = require(path.resolve(__dirname, '../dist', 'vue-ssr-client-manifest.json'));
let serverBundle = require(path.resolve(__dirname, '../dist', 'vue-ssr-server-bundle.json'));
```

首先我们根据前面配置的客户端与服务端相关构建的配置，分别打包构建完并待相关结果输出到`dist`目录下之后，就可以直接在服务端代码中将客户端配置构建的`manifest`文件与服务端配置构建的`bundle`文件进行导入，后续会需要配合生成`renderer`。

#### 创建renderer

```js
const { createBundleRenderer } = require('vue-server-renderer');
const template = fs.readFileSync('./index.html', 'utf-8')
const renderer = createBundleRenderer(serverBundle, {
  template,
  clientManifest,
  runInNewContext: false
});
```

这里主要用到了`vue-server-renderer`的`createBundleRenderer`，并读取了一个模板文件`template`用于渲染，按照相关配置参数，分别传入`serverBundle`和`clientManifest`，同时，设置`runInNewContext`为`false`，这一步主要是让关闭所有请求自动创建一个新的上下文，这种方式可以减少服务器的压力，毕竟对于服务端而言，如果在请求量过多的情况下，这种方式开销会比较大。


#### 执行渲染&返回给客户端

```js
app.use(express.static(path.resolve(__dirname, '../dist')));
router.get('*', (req, res) => {
    const context = { url: req.url };
    renderer.renderToString(context, (err, html) => {
        if (err) {
            if (err.code === 404) {
                return res.end('404 Not Found');
            }
            console.log(err)
        };
        res.setHeader('Content-Type', 'text/html')
        res.send(html);
    })
})
```

这里为了方便就直接将`dist`目录开放为静态资源目录了，同时拦截所有请求执行渲染逻辑，将渲染成功后的结果发送给客户端进行展示。

首先我们可以关注一下这个`context`对象，内容主要是一个请求的`url`，主要用于获取当前用户请求的路由，做一些数据预取的操作，具体使用这个`context`的代码可以参见前面的服务端`entry-server.js`文件，入参`context`就是这个地方的`context`对象，这里会自动调用我们的服务端打包出来的入口方法，获取到我们整个业务代码的实例（参见我们在`entry-server.js`中`resolve`的`app`实例），这样我们就能正确渲染出我们想要的页面了。

得到渲染后的结果之后，我们就能直接调用`express`为我们提供的`send`方法或`end`方法给客户端返回结果了。


#### 完整代码

```js
const { createBundleRenderer } = require('vue-server-renderer');
const express = require('express');
const app = express();
const router = express.Router();
const chalk = require('chalk');
const fs = require('fs');
const template = fs.readFileSync('./index.html', 'utf-8')
const path = require('path');
let clientManifest = require(path.resolve(__dirname, '../dist', 'vue-ssr-client-manifest.json'));
let serverBundle = require(path.resolve(__dirname, '../dist', 'vue-ssr-server-bundle.json'));

app.use(express.static(path.resolve(__dirname, '../dist')));

const renderer = createBundleRenderer(serverBundle, {
    template,
    clientManifest,
    runInNewContext: false
});

router.get('*', (req, res) => {
    const context = { url: req.url };
    renderer.renderToString(context, (err, html) => {
        if (err) {
            if (err.code === 404) {
                return res.end('404 Not Found');
            }
            console.log(err)
        };
        res.setHeader('Content-Type', 'text/html')
        res.send(html);
    })
})

app.use(router);

app.listen(3000, function() {
    console.log(
        'App runing at:',
        `Local: ${ chalk.blueBright.underline('http://localhost:3000') }`
    )
});
```

#### 预览效果
[![预览.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dda12046752045da935af81a36f1d746~tplv-k3u1fbpfcp-zoom-1.image)](https://imgchr.com/i/yASTyD)

直接通过`node`执行该文件，我们就能通过浏览器访问到我们的应用了。

> 在启动服务之前，请确保你的客户端manifest文件和服务端构建bundle已经构建完毕了，如果没有请先构建一下，也就是前面提到的webpack配置的两份打包配置文件。

## 一键式启动项目与热更新
### 痛点

在经受完前面一堆代码的洗礼之后，相信读者或许感受到启动项目的不方便了，首先先得将业务代码按照两份配置构建一遍，接着再来启动服务，这让我们在调试过程中十分不友好。

不仅如此，我们在修改了前端页面代码之后，我们还得重新构建一遍，然后再启动项目，即便是只添加了一个字，我们都需要重复走一遍这个逻辑，是不是十分的难受。

### 需求

针对上述问题，这里提出几点优化目标：
1. 首先我们能否一键自动构建并启动项目，解决繁琐的启动流程。
2. 其次，是否能实现热更新能力，页面修改内容之后能无刷新更新页面。
3. 在具备了前端代码热更新能力之后，我们修改了`webpack`相关配置文件是否也能自动重新构建并重启服务。

### 优化
针对上述优化目标，这里也将逐一进行解决。

为了实现一键启动项目并实时打包构建，这里需要修改一下服务端代码，集成`webpack`打包能力，话不多说，先上码：

#### 完整代码

```js
const { createBundleRenderer } = require('vue-server-renderer');
const express = require('express');
const app = express();
const router = express.Router();
const chalk = require('chalk');
const fs = require('fs');
const template = fs.readFileSync('./index.html', 'utf-8')
const path = require('path');
let clientManifest = require(path.resolve(__dirname, 'dist', 'vue-ssr-client-manifest.json'));
let serverBundle = require(path.resolve(__dirname, 'dist', 'vue-ssr-server-bundle.json'));

// ------可以从这开始看
const webpack = require('webpack');
const WebpackDevMiddleware = require('webpack-dev-middleware');
const WebpackHotMiddleware = require('webpack-hot-middleware');
const clientWebpackConfig = require('./build/webpack.client.config');
const serverWebpackConfig = require('./build/webpack.server.config')
const clientCompiler = webpack(clientWebpackConfig);
const serverCompiler = webpack(serverWebpackConfig);
let renderer = {};
let buildCount = 0;

// 客户端构建
const clientMiddleware = WebpackDevMiddleware(clientCompiler)
app.use(clientMiddleware);

clientCompiler.hooks.done.tap('compilerDone', () => {
    console.log('客户端构建完成')
    clientManifest = JSON.parse(clientMiddleware.context.outputFileSystem.readFileSync(path.join(clientWebpackConfig.output.path, 'vue-ssr-client-manifest.json')).toString())
    runBuildRenderer();
})

// 服务端构建
const serverMiddleware = WebpackDevMiddleware(serverCompiler)
app.use(serverMiddleware);
serverCompiler.hooks.done.tap('compilerDone', () => {
    console.log('服务端构建完成')
    serverBundle = JSON.parse(serverMiddleware.context.outputFileSystem.readFileSync(path.join(clientWebpackConfig.output.path, 'vue-ssr-server-bundle.json')).toString())
    runBuildRenderer();
})

// 判断并重新创建新的renderer
function runBuildRenderer(init = false) {
    buildCount++;
    if (!init && buildCount < 2) return;
    if (clientManifest && serverBundle) {
        buildCount = 0;
        console.log('新的renderer已产生')
        renderer = createBundleRenderer(serverBundle, {
            template,
            clientManifest,
            runInNewContext: false
        })
    }
}

// 热更新中间件
app.use(WebpackHotMiddleware(clientCompiler, { log: false }));
runBuildRenderer(true);

// ------到这

app.use(express.static(path.resolve(__dirname, './dist')))

router.get('*', (req, res) => {
    const context = { url: req.url };
    renderer.renderToString(context, (err, html) => {
        if (err) res.send(err);
        res.send(html);
    })
})

app.use(router);

app.listen(3000, function() {
    console.log(
        'App runing at:',
        `Local: ${ chalk.blueBright.underline('http://localhost:3000') }`
    )
});
```
大家看到这么老长一段代码不要慌张，且听笔者为你细细道来。
#### 逻辑分析
这里关键部分就在上述笔者标记的代码段中间，首先这里会涉及到三个库：
- `webpack`：用于构建。
- `webpack-dev-middleware`：用于配合`webpack`将构建好的文件保存在内存中，而不是写入到文件。
- `webpack-hot-middleware`：用于配合实现热更新。

#### webpack构建部分

```js
const webpack = require('webpack');
const WebpackDevMiddleware = require('webpack-dev-middleware');
const clientWebpackConfig = require('./build/webpack.client.config');
const serverWebpackConfig = require('./build/webpack.server.config')
const clientCompiler = webpack(clientWebpackConfig);
const serverCompiler = webpack(serverWebpackConfig);
const clientMiddleware = WebpackDevMiddleware(clientCompiler)
const serverMiddleware = WebpackDevMiddleware(serverCompiler)
```

这里主要是服务端进行`webpack`打包，配合`webpack-dev-middleware`，实现对构建完毕资源的访问。

从代码上看，首先引入`webpack`与`webpack-dev-middleware`包，接着导入客户端构建与服务端构建这两份`webpack`配置文件用于生成`compiler`，然后使用`webpack-dev-middleware`，实现将构建代码输出到内存中便于访问。

这里由于构建之后的内容都输出到了内存中，而在生成`renderer`的部分需要客户端构建`manifest`文件和服务端构建的`bundle`文件，所以我们得想办法在它们构建完之后触发重新生成`renderer`，以便于实现修改`webpack`配置文件也能顺利生成新的`renderer`。

所以呢，鉴于以上问题，我们需要去监听一下`webpack`构建完成的事件，也就是当它构建完之后就重新执行生成`renderer`逻辑。

##### 客户端构建部分

```js
// 客户端构建
clientCompiler.hooks.done.tap('compilerDone', () => {
    console.log('客户端构建完成')
    clientManifest = JSON.parse(clientMiddleware.context.outputFileSystem.readFileSync(path.join(clientWebpackConfig.output.path, 'vue-ssr-client-manifest.json')).toString())
    runBuildRenderer();
})
```
> 这里我们定义了一个全局变量`clientManifest`，用于每次构建都能被实时访问到。

这里我们就通过生成的客户端构建实例来注册一个编译完成的事件，注册完之后，`webpack`内部就会帮我们调用这个回调函数，同时我们这个时候在回调函数中就能访问到构建好的文件了，具体实现如上。在读取完对应文件之后，我们重新执行创建`renderer`函数，就能更新`renderer`了。

> 这个`runBuildRenderer`函数放在后面分析，不要慌。

##### 服务端构建部分
同理，跟客户端构建类似。

```js
// 服务端构建
serverCompiler.hooks.done.tap('compilerDone', () => {
    console.log('服务端构建完成')
    serverBundle = JSON.parse(serverMiddleware.context.outputFileSystem.readFileSync(path.join(clientWebpackConfig.output.path, 'vue-ssr-server-bundle.json')).toString())
    runBuildRenderer();
})
```

我们通过观察可以发现，这里的客户端构建与服务端构建部分主要做的事情就是等`webpack`构建好了之后更新相关全局变量的值，同时执行这个`runBuildRenderer`函数，先从名字来看，就是用来重新生成`renderer`的，那么接下来让我们看看它内部的实现吧。

##### runBuildRenderer

为什么客户端部分和服务端部分都会调用这个函数，这是因为生成`renderer`需要客户端与服务端构建的结果，而他们的构建又没法保证顺序，所以这里会都调用一次，然后维护一个`buildCount`变量，执行一次则加一，等到被调用了两次也就是客户端构建和服务端构建都完成了再更新`renderer`，并重置`buildCount`为下一次做准备。

```js
function runBuildRenderer(init = false) {
    buildCount++;
    if (!init && buildCount < 2) return;
    if (clientManifest && serverBundle) {
        buildCount = 0;
        console.log('新的renderer已产生')
        renderer = createBundleRenderer(serverBundle, {
            template,
            clientManifest,
            runInNewContext: false
        })
    }
}
```

从功能上来看也是比较简单的，主要就是用来生成新的`renderer`，同时区分了初始化和热更新的状态，初始化的时候我们默认直接取打包到`dist`目录中的结果；如果是热更新阶段，那么就需要等`clientManifest`、`serverBundle`都构建好了再重新`rebuild`。

> 当然了，初始化的时候笔者会调用一次，并给`init`参数传为`true`，生成`renderer`，以用于保证初始渲染能力。

#### 浏览器热更新

正如我们使用`vue`脚手架启动项目一样，我们也希望能够在业务代码改变之后，页面自动热更新，而不需要我手动刷新页面，这个时候就需要我们`webpack-hot-middleware`来配合了。

```js
// server.js
const WebpackHotMiddleware = require('webpack-hot-middleware');
app.use(WebpackHotMiddleware(clientCompiler, { log: false }));
```
我们在`server.js`中也就是服务端添加一个中间件即可。

> 注意！还没完，我们还需要做一件事才能生效。

##### 修改客户端构建webpack配置
```js
const webpack = require('webpack')
const hotModuleScript = 'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=10000&reload=true'

{
    entry: [hotModuleScript, path.resolve(__dirname, '../entry-client.js')],
    plugins: [new webpack.HotModuleReplacementPlugin()]
}
```

我们得把我们客户端构建的入口配置改一下，以数组形式，在原有的入口文件前面添加这么一段。

同时，添加一个新插件(`plugin`)，它是我们`webpack`内置的，可以直接通过`webpack.`来获取。

## 总结
![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9e75a8da95924d119b8fb72c94325588~tplv-k3u1fbpfcp-zoom-1.image)

总体来说涉及流程还蛮多的，稍微有点小复杂，对于不熟悉`node`和`webpack`的童鞋来说可能会稍微有点不太好理解，不过也不用慌，按照笔者前面给出的架构图来看，应该也能知晓到大概的步骤。

> 如果遇到面试问到，说不定就算不会，也能说到一二。万一面试官都不会，那就更加精彩了（手动滑稽）。

对于服务端渲染来说呢，我们更多需要考虑的还是服务端的请求处理压力问题，毕竟在某些并发量大的情况下容易造成服务崩溃，同时由于`Node`是单线程工作，所以如果不做特殊处理导致服务器不可用那么整个网站也将无法访问了，当然我们也可以开启多线程，尽可能利用服务器多核处理能力，来分担服务器处理请求的压力。

不仅如此，我们也可以为服务器`cpu`占用设定一个阈值，一旦达到或超过这个设定的阈值就直接降级到`csr`（客户端渲染）模式，也能有效降低服务器的几率。

除了以上提到的优化的手段，我们也可以在提高服务稳定性上来进行多层次分析，比如接入监控、日志系统、进程守护等等。

或者也可以采用缓存，减少一些不必要的重复渲染，常见的比如配合`lru-cache`实现页面级缓存或组件级别缓存等；如果是在多进程场景下，可能会出现不同进程缓存内容不同享的问题导致缓存失效，我们可以针对这种情况引入`redis`提供缓存服务。

### 参考链接
[后端渲染、客户端渲染(CSR)、同构应用(SSR)](https://github.com/amandakelake/blog/issues/60)

[单页应用多路由预渲染指南](https://beyoursun.github.io/2017/10/13/Spa-Prerender-Guide/)