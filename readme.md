# koishi-plugin-smmcat-economy

[![npm](https://img.shields.io/npm/v/koishi-plugin-smmcat-economy?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-smmcat-economy)

通用道具交易市场

提供商品上架和买卖记录的操作，可对接其他插件。充当交易市场：

### 卖东西
通过 **await ctx.economy.sellMarketSomeItem(session, upValue)** 提交商品 
但具体 道具数据的移除操作 由调用该服务的插件作者控制，插件只是起到提交作用

### 买东西
通过事件 **ctx.economy.on('buying', async (event: Economy_EventData<Economy_BuyEventData>) => {})** 
获取用户购买的 **event.upValue** 数据信息，但具体 道具数据的添加、扣款操作、获款操作 由调用该服务的插件作者在自己插件实现
插件只是起到 采集和提交 商品交易成功的媒介

买成功后，请记得修改 **event.upValue.isBuy** 为 true

### 下架回收
超过上架时效的商品，会暂时以 已下架 状态存留，不显示在商店列表中，并且呈现可回收状态

需要各个插件作者通过调用 **await ctx.economy.recycleProduct(session, 标识by, callback)**
在回调函数 **callback** 中接收 **event** 事件，类型为 Economy_DelistData 数据，当操作完成时，需要将 **event.isRecycle** 改为 true
但具体去 道具数据的返还操作 由其他插件作者自行实现和控制，插件只是起到采集和删除店铺下架商品的作用

***
### 演示代码

``` typescript
import { Context, Schema, Session, h } from 'koishi'
import { } from 'koishi-plugin-smmcat-economy'
import { Economy_BuyEventData, Economy_DelistData, Economy_EventData } from 'koishi-plugin-smmcat-economy/lib/type'

export const name = 'smmcat-trydemo'

export interface Config { }
export const inject = ['economy']
export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context, config: Config) {

  ctx.economy.on('buying', async (event: Economy_EventData<Economy_BuyEventData>) => {
    console.log("收到事件");

    await event.session.send(
      `${h.image(event.upValue.pic)}` +
      `商品名:${event.upValue.name}\n` +
      `下单数量:${event.upValue.quantity}\n` +
      `总价:${event.upValue.total}\n` +
      '请在20秒内决定购买.\n如若购买请发 "是"')

    const res = await event.session.prompt(20000)
    if (res === undefined) {
      await event.session.send('超时结束...')
      return
    }

    // 操作扣款、到账、道具获得等操作

    if (res.trim() === "是") {
      // 如购买完成 请修改 isBuy 为 true
      event.upValue.isBuy = true
      await event.session.send('购买完成...')
    }
  }, 'ceshi')

  ctx
    .command('测试上架 <name>')
    .action(async ({ session }, name) => {
      await session.send('20秒内请提交商品')
      const res = await session.prompt(20000)
      if (res == undefined) return

      // 操作道具扣除等操作
      // 巴拉巴拉巴拉
      
      const upValue = {
        pic: 'https://smmcat.cn/wp-content/uploads/2024/12/DFC65DB8218C6820BD5E1BF181D545CD.jpg',
        name: res,
        total: 10,
        price: 1,
        by: 'ceshi',
        type: 0,
        isSell: true
      }
      await ctx.economy.sellMarketSomeItem(session, upValue)
      await session.send('上架完成...')
    })

  ctx
    .command('店铺回收')
    .action(async ({ session }) => {
      ctx.economy.recycleProduct(session, 'ceshi', async (event: Economy_DelistData) => {
        console.log(event.upValue);
        // 操作数据退回到用户仓库 ↓
        // 巴拉巴拉巴拉 操作完成

        event.isRecycle = true
      })
    })
}
```