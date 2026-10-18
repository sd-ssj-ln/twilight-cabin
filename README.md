# 暮色林中小屋 · a cabin at dusk

一段可漫游的暮色林间短景。整幅画面与全部声音都在浏览器里实时生成，没有图片、视频或音频素材，也没有外部依赖。

## 打开

直接双击 `index.html` 即可。也可以把它放进任意静态服务器（VS Code Live Server、`npx serve` 等）访问，不需要构建步骤。

推荐 Chrome / Edge / Safari 的较新版本。声音需要一次点击才能启动，这是浏览器的自动播放限制，不是故障。

## 可以做什么

**林间**

- 移动鼠标，画面会轻微视差；靠近可交互处，光圈会放大。
- 点击木门或底部「推门」进入屋内；点击檐下灯可以开关灯；窗户、烟囱、月亮、水洼各有回应。
- 底部时刻轨切换「黄昏 / 入夜 / 深夜」，光线、窗色、月亮高度、雾气都会改变。
- 「细雨」开关雨水与湿地反光；「声音」开关程序化环境声。

**屋内**

- 壁炉：拨火，火势会旺一阵。
- 猫：在边桌下打盹，点一下会抬头。
- 茶杯：续上热气；收音机：换台并奏出一小段五声音阶；窗帘：拉开或合上；扶手椅：坐下歇一会儿。
- 右下角「回到林间」或按 `Esc` 出门。

**键盘**

| 键 | 作用 |
| --- | --- |
| `1` `2` `3` | 黄昏 / 入夜 / 深夜 |
| `R` | 细雨开关 |
| `S` | 声音开关 |
| `L` | 檐灯开关（屋外） |
| `E` | 进门 / 出门 |
| `Esc` | 从屋内回到林间 |

手机竖屏时，屋内可以左右拖动；底部提示会说明这一点。

## 画面与声音

- 1600×900 的逻辑画布，`cover` 方式适配窗口；设备像素比上限 2，避免高 DPI 下过度绘制。
- 森林、木屋、房间、火焰、猫、雨、雾、萤火虫、流星全部由 Canvas 2D 路径与渐变绘制；分层离屏缓存只重建一次，动画阶段逐层合成。
- 声音是 WebAudio 实时合成：风、雨、柴火、低频房间共鸣，以及收音机里的五声音阶短句。没有采样文件。
- 尊重 `prefers-reduced-motion`：减少视差、粒子和镜头运动。

## 放到公网

这是零依赖的纯静态站点，整个目录原样上传即可，适合 GitHub Pages、Cloudflare Pages、Netlify 或任意静态服务器。注意要连同 `style.css`、`art.js`、`scene.js`、`favicon.svg` 一起上传，不能只传 `index.html`。

如果使用 GitHub Pages：把目录推到仓库的 `main` 分支，在 Settings → Pages 选择 `Deploy from a branch` / `main` / `/ (root)`，几分钟后得到公开地址。页面里的资源全部是相对路径，放在子目录（例如 `https://name.github.io/twilight-cabin/`）也能正常工作。

## 调试参数

用于截图或直接看某个时刻：

```
?view=exterior&phase=0.28&rain=0
?view=interior&phase=0.86&rain=1&curtain=1&radio=1
```

- `view`：`exterior` 或 `interior`，存在即跳过开场。
- `phase`：0–1，对应黄昏到深夜。
- `rain=1`、`curtain=1`、`radio=1`：直接打开对应状态。

## 文件

| 文件 | 内容 |
| --- | --- |
| `index.html` | 语义结构和 HUD |
| `style.css` | 画幅、排版、HUD、颗粒、暗角、响应式 |
| `art.js` | 全部程序化绘画与外景/内景分层 |
| `scene.js` | 相机、交互、状态、转场、WebAudio、调试接口 |
| `favicon.svg` | 朱砂印章图标 |
| `og-cover.jpg` | 1200×630 分享封面 |
| `preview-desktop.png` | 桌面林间预览 |
| `preview-interior.png` | 屋内预览 |
| `preview-mobile.png` | 390px 竖屏预览 |

`window.CabinDebug` 暴露了 `state / view / cam / setTime / toggleWeather / toggleLamp / toggleSound / runAction / worldToScreen / activeHotspots`，方便继续调试。
