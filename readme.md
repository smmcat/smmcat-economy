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