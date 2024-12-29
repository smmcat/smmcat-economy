import { Context, Schema, Session, Service, h } from 'koishi'
import { } from 'koishi-plugin-smmcat-localstorage'
import { } from 'koishi-plugin-puppeteer'
import path from 'path'
import fs from 'fs/promises'
import type { logsItem, Economy_BuyEventData, SellingUpData, UserMarketItem, Economy_DelistData } from './type'
import { LogStatus, StorageStatus } from './type'
import { html } from './html'

export const name = 'smmcat-economy'

export interface Config {
  botId: string,
  basePath: string
  logPath: string
  debug: boolean
  accountPath: string
  sellAwaitTime: number
  shelfLifeTime: number
  pageLength: number
  currencyName: string
}

export const usage = `
通用商店交易系统

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
`

export const inject = ['localstorage', 'puppeteer']

export const Config: Schema<Config> = Schema.object({
  botId: Schema.string().default('').description('QQbot的id 用于获取玩家头像'),
  basePath: Schema.string().default('common-market').description('店铺信息文件存放位置'),
  logPath: Schema.string().default('common-market-log').description('用户交易日志存放地址'),
  accountPath: Schema.string().default('common-market-account').description("收益结算日志存放地址"),
  debug: Schema.boolean().default(false).description('日志查看更多信息'),
  sellAwaitTime: Schema.number().default(60000).description('上架延迟时间(ms)'),
  shelfLifeTime: Schema.number().default(259200000).description('上架持续时间(一天为 86400000ms),超时自动下架'),
  pageLength: Schema.number().default(10).description('每页显示数量'),
  currencyName: Schema.string().default('灵石').description('货币名字')
})

declare module 'koishi' {
  interface Context {
    economy: EconomyClass
  }
}

class EconomyClass extends Service {
  private marketList: { [key: string]: UserMarketItem[] }
  private userLogList: {}
  private accountList: { [key: string]: { earnings: number, logs: { [key: string]: number } } }
  lastId: number
  private events: { [key: string]: { callback: Function, by: string }[] };
  constructor(ctx: Context, config: Config) {
    super(ctx, 'economy', true);
    /** 商店数据列表 */
    this.marketList = {}
    /** 日志列表 */
    this.userLogList = {}
    /** 收货账单 */
    this.accountList = {}
    this.ctx = ctx
    this.lastId = 0
    this.config = config
    this.events = {}

    this.ctx.on('ready', () => {
      this.init()
      html.botId = config.botId
      html.countdownTime = config.shelfLifeTime
      html.currencyName = config.currencyName
    })

    ctx.on('dispose', () => {
      this.events = {}
    })

    ctx
      .command('商店')

    ctx
      .command('商店/查看日志')
      .action(async ({ session }) => {
        this.getLogInfo(session)
      })

    this.ctx
      .command('商店/查看商店 <type>')
      .action(async ({ session }, type) => {
        if (type) {
          await this.getMarketList(session, type)
          return
        }
        await this.getMarketList(session)
      })

    ctx
      .command('商店/商店购买 <shopId:number> <quantity:number>').userFields(['id','name','permissions'])
      .action(async ({ session }, shopId, quantity = 1) => {
        if ((quantity = Math.floor(quantity)) < 1 && (shopId = Math.floor(shopId)) < 1) {
          await session.send('店铺id有误或者选购的数量小于1')
          return
        }
        const allMarket: UserMarketItem[] = this.updateMarket().filter((item: UserMarketItem) => item.status == StorageStatus.已上架)
        const marketItem: UserMarketItem = allMarket.find((item) => item.id === shopId)
        if (!marketItem) {
          await session.send('没有找到对应店铺,或者该店铺已下架')
          return
        }
        // 准备购买
        await this.buyMarketSomeItem(marketItem, session, quantity)
      })

    ctx
      .command('商店/收益统计').userFields(['id','name','permissions'])
      .action(async ({ session }) => {
        this.getEarnings(session)
      })

    ctx
      .command('商店/商品回收').userFields(['id','name','permissions'])
      .action(async ({ session }) => {
        this.setrecycleProductEvent(session)
      })
  }
  /** 接收事件 */
  public on(event: string, callback: Function, by = 'all'): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    const temp = {
      callback,
      by
    }
    this.events[event].push(temp);
  }
  /** 触发事件 */
  public async emit<T>(event: string, eventData?: { session: Session, by: string, upValue: T, isOver?: boolean }): Promise<void | boolean> {
    if (this.events[event]) {
      await Promise.all(this.events[event].map(_event => {
        console.log(eventData.by);
        console.log(_event.by);
        if (eventData.by == _event.by || _event.by == 'all') {
          return Promise.resolve(_event.callback(eventData))
        }
        return null
      }))
    }
  }
  /** 商店初始化 */
  private async init() {
    const upath = path.join(this.ctx.localstorage.basePath, this.config.basePath)
    const logPath = path.join(this.ctx.localstorage.basePath, this.config.logPath)
    const accountPath = path.join(this.ctx.localstorage.basePath, this.config.accountPath)
    try {
      await fs.readdir(upath)
    } catch (error) {
      await fs.mkdir(upath, { recursive: true })
    }
    try {
      await fs.readdir(logPath)
    } catch (error) {
      await fs.mkdir(logPath, { recursive: true })
    }
    try {
      await fs.readdir(accountPath)
    } catch (error) {
      await fs.mkdir(accountPath, { recursive: true })
    }
    const marketTemp: { [key: string]: UserMarketItem[] } = {}
    const logTemp = {}
    const accountTemp = {}
    let maxId = 0
    const status = { market: { ok: 0, err: 0 }, log: { ok: 0, err: 0 }, account: { ok: 0, err: 0 } }
    const eventList = (await fs.readdir(upath)).map((item) => {
      return new Promise(async (resolve, reject) => {
        try {
          marketTemp[item] = JSON.parse(await this.ctx.localstorage.getItem(`${this.config.basePath}/${item}`))
          const _maxId = Math.max(...marketTemp[item].map((item) => item.id))
          if (_maxId > maxId) {
            maxId = _maxId
          }
          status.market.ok++
          resolve(true)
        } catch (error) {
          console.log(error);
          status.market.err++
          resolve(true)
        }
      })
    })
    const eventLogList = (await fs.readdir(logPath)).map((item) => {
      return new Promise(async (resolve, reject) => {
        try {
          logTemp[item] = JSON.parse(await this.ctx.localstorage.getItem(`${this.config.logPath}/${item}`))
          status.log.ok++
          resolve(true)
        } catch (error) {
          console.log(error);
          status.log.err++
          resolve(true)
        }
      })
    })
    const eventAccountList = (await fs.readdir(accountPath)).map((item) => {
      return new Promise(async (resolve, reject) => {
        try {
          accountTemp[item] = JSON.parse(await this.ctx.localstorage.getItem(`${this.config.accountPath}/${item}`))
          status.account.ok++
          resolve(true)
        } catch (error) {
          console.log(error);
          status.account.err++
          resolve(true)
        }
      })
    })
    await Promise.all(eventList)
    await Promise.all(eventLogList)
    await Promise.all(eventAccountList)
    console.log(`交易市场数据初始化完成,加载成功${status.market.ok}个用户数据,失败${status.market.err}个用户数据`);
    console.log(`交易市场日志初始化完成,加载成功${status.log.ok}个用户数据,失败${status.log.err}个用户数据`);
    console.log(`交易市场结算账单初始化完成,加载成功${status.account.ok}个用户数据,失败${status.account.err}个用户数据`);

    this.marketList = marketTemp
    this.userLogList = logTemp
    this.accountList = accountTemp
    this.lastId = maxId
  }
  /** 日志记录 */
  private async logRecording(item: logsItem, userId: string) {
    if (!this.userLogList[userId]) {
      this.userLogList[userId] = []
    }
    this.userLogList[userId].push(item)
    this.updateUserLogStore(userId)
  }
  private async getLogInfo(session: Session) {
    if (!this.userLogList[session.userId]) {
      this.userLogList[session.userId] = []
    }
    const msg = this.userLogList[session.userId].map((item: logsItem) => {
      return `${new Date(item.time).toLocaleString('zh-CN')}\n` +
        `操作：${LogStatus[item.type]}\n` +
        `目标：${item.name}\n` +
        `数量：${item.total}\n` +
        `单价：${item.price}`
    }).join('\n\n')

    await session.send(msg)
  }
  /** 更新市场状态 */
  private updateMarket() {
    const that = this
    /** 获取所有店铺信息 */
    const allMarket: UserMarketItem[] = []
    Object.keys(this.marketList).map((userId: string) => {
      let isUp = false

      const nowTime = +new Date()
      // 遍历待上架状态商品
      this.marketList[userId].forEach((item: UserMarketItem) => {
        // 是否需要上架
        if (item.status == StorageStatus.待上架 && nowTime - item.time > this.config.sellAwaitTime) {
          // 通知更新
          isUp = true
          // 通知上架
          item.status = StorageStatus.已上架

          /** 记录日志 */
          const temp: logsItem = {
            name: item.name,
            price: item.price,
            total: item.total,
            time: item.time + that.config.sellAwaitTime,
            for: userId,
            type: LogStatus.上架
          }
          that.logRecording(temp, userId)
        }
        // 是否需要下架
        if (item.status == StorageStatus.已上架 && nowTime - item.time > this.config.shelfLifeTime) {
          // 通知更新
          isUp = true
          // 通知下架
          item.status = StorageStatus.已下架

          /** 记录日志 */
          const temp: logsItem = {
            name: item.name,
            price: item.price,
            total: item.total,
            time: item.time + that.config.shelfLifeTime,
            for: userId,
            type: LogStatus.下架
          }
          that.logRecording(temp, userId)
        }
      })
      /** 更新本地数据 */
      isUp && this.updateUserMarketStore(userId)
      /** 添加至全局数据 */
      allMarket.push(...this.marketList[userId])
    })
    return allMarket
  }
  /** 获取收益信息 */
  private async getEarnings(session: Session) {
    const userId = session.userId
    const res = this.accountList[userId]
    if (res.earnings == 0 && Object.keys(res.logs).length) {
      await session.send('当前没有收益')
    }
    const msg = `当前店铺收益信息：` + `\n----收益信息----\n` + `一共卖出 ${res.earnings} ${this.config.currencyName}` + `\n\n----卖出内容----\n` + Object.keys(res.logs).map((item) => {
      return `[${item}] x${res.logs[item]}`
    }).join('\n')
    await session.send(h.at(session.userId) + msg)
  }
  /** 发送商品回收事件 */
  private async setrecycleProductEvent(session: Session) {
    this.updateMarket()
    const userId = session.userId
    if (!this.events['recycle']) {
      session.send('未绑定任何接收事件方，回收商品失败')
      return
    }
    const temp = {}
    const markTemp = {}
    const eventKey = [...new Set(Object.keys(this.events['recycle']).map((item) => this.events['recycle'][item].by))]
    // 监听绑定的事件
    const eventList = eventKey.map((item) => {
      return new Promise(async (resolve) => {
        const filterList = this.marketList[userId].filter((i) => i.by === item)
        const recycleList = filterList.filter((i) => i.status === StorageStatus.已下架)
        markTemp[item] = recycleList
        /** 推送内容 */
        const upValue = recycleList.map((item) => {
          return {
            total: item.total,
            price: item.price,
            by: item.by,
            name: item.name
          }
        })
        const eventData = { session, upValue, by: item, isOver: false }
        await this.emit('recycle', eventData)
        console.log(eventData.isOver);
        eventData.isOver ? (temp[item] = true) : (temp[item] = false)
        resolve(true)
      })
    })

    await Promise.all(eventList)
    const msg = Object.keys(temp).map((by) => {
      this.marketList[userId] = this.marketList[userId].filter((item) => !(item.status === StorageStatus.已下架 && item.by === by))
      return temp[by] ? `委派 ${by} 的操作完成回调` : ''
    }).join('\n')
    this.updateUserMarketStore(userId)
    await session.send(msg)
  }
  /** 商品回收 */
  public async recycleProduct(session: Session, by: string, callback: (upValue: Economy_DelistData) => Promise<void> | void) {
    this.updateMarket()
    const userId = session.userId
    const recycleList = this.marketList[userId].filter((item) => item.status === StorageStatus.已下架 && item.by === by)
    if (!recycleList.length) {
      await session.send('当前没有下架任何商品')
      await callback({ upValue: [], isRecycle: false })
      return
    }
    const upValue = recycleList.map((item) => {
      return {
        total: item.total,
        price: item.price,
        by: item.by,
        name: item.name
      }
    })

    const temp = { upValue, isRecycle: false }
    await callback(temp)
    if (temp.isRecycle) {
      await session.send('店铺系统收到回收成功回调，操作成功')
      await session.send(`回收完成，处理的内容：\n${recycleList.map(item => `店铺id:[${item.id}]\n${item.total}个${item.name}`).join('\n')}`)
      this.marketList[userId] = this.marketList[userId].filter((item) => !(item.status === StorageStatus.已下架 && item.by === by))
      this.updateUserMarketStore(userId)
    }
  }
  /** 购买商店中的某个商品 */
  private async buyMarketSomeItem(item: UserMarketItem, session: Session, quantity: number) {
    if (quantity > item.total) {
      await session.send('购买数量大于店铺目前存在数量.购买失败...')
      return
    }
    const temp = {
      pic: item.pic,
      name: item.name,
      quantity,
      price: item.price,
      total: item.price * quantity,
      by: item.by,
      userId: item.userId,
      /** 操作完成后,请改为 true */
      isBuy: false
    }
    await this.emit<Economy_BuyEventData>('buying', { session, upValue: temp, by: item.by })
    console.log(Object.keys(this.events).length);

    if (!temp.isBuy) {
      console.log(temp);
      await session.send('购买失败')
      return
    }
    await session.send('店铺系统收到回调,操作成功!正在整理店铺信息')
    item.total -= quantity
    if (item.total <= 0) {
      item.status = StorageStatus.已完成
    }

    /** 记录收益 */
    if (!this.accountList[item.userId]) {
      this.accountList[item.userId] = { earnings: 0, logs: {} }
    }
    if (!this.accountList[item.userId].logs[item.name]) {
      this.accountList[item.userId].logs[item.name] = 0
    }
    this.accountList[item.userId].earnings += item.price * quantity
    this.accountList[item.userId].logs[item.name] += quantity
    this.updateAccountStore(item.userId)

    /** 记录日志 */
    const logTemp: logsItem = {
      name: item.name,
      price: item.price,
      total: quantity,
      time: +new Date(),
      for: item.userId,
      type: LogStatus.购买
    }
    const anotherlogTemp: logsItem = {
      name: item.name,
      price: item.price,
      total: quantity,
      time: +new Date(),
      for: session.userId,
      type: LogStatus.卖出
    }
    this.logRecording(logTemp, session.userId)
    this.logRecording(anotherlogTemp, item.userId)
  }

  /** 上架商品 */
  public async sellMarketSomeItem(session: Session, upValue: SellingUpData) {
    this.updateMarket()
    const marketItem: UserMarketItem = {
      pic: '',
      name: '',
      total: 0,
      price: 0,
      userId: session.userId,
      id: ++this.lastId,
      username: '',
      time: +new Date(),
      status: StorageStatus.待上架,
      type: '',
      by: ''
    }
    const _temp = {
      pic: '',
      name: '',
      total: 0,
      price: 0,
      by: '',
      type: '',
      isSell: false
    }

    const temp = Object.assign(_temp, upValue)
    if (!temp.isSell) {
      await session.send('上传失败')
      new Error("店铺内容上传失败")
      return
    }
    await session.send('店铺系统收到回调,正在提交店铺信息')
    delete temp.isSell
    const upMarketItem: UserMarketItem = Object.assign(marketItem, temp)
    if (!this.marketList[session.userId]) {
      this.marketList[session.userId] = []
    }
    this.marketList[session.userId].push(upMarketItem)
    await session.send(`上传完成，等待上架，\n预计${this.config.sellAwaitTime / 1000}秒后上架`)
    this.updateUserMarketStore(session.userId)
  }
  // 获取平均价
  private getAveragePrice(data: UserMarketItem[]) {
    const temp = {}
    data.forEach((item) => {
      if (!temp[item.name]) {
        temp[item.name] = item.price
      } else {
        temp[item.name] = temp[item.name] === item.price ? item.price : Math.floor((temp[item.name] + item.price) / 2)
      }
    })
    return temp
  }
  // 获取店铺列表
  private async getMarketList(session: Session, filter?: string | undefined) {

    let allMarket: UserMarketItem[] = this.updateMarket().filter((item: UserMarketItem) => item.status == StorageStatus.已上架)
      .sort((a: UserMarketItem, b: UserMarketItem) => b.time - a.time)
    // 平均价列表
    const averageList: { [key: string]: number } = this.getAveragePrice(allMarket)
    // 如果需要过滤
    if (filter) {
      allMarket = allMarket.filter((item) => item.type === filter)
    }
    const emitList = { allMarket, session, list: [] }
    // 发送 getMarket 事件
    // await this.emit('getMarket', emitList)
    console.log(emitList.list);

    if (allMarket.length === 0) {
      await session.send('当前商城没有任何商品')
      return
    }
    let index = 0
    let maxPage = Math.ceil(allMarket.length / this.config.pageLength)
    // 进入商店列表展示环节
    while (true) {
      const temp = allMarket.slice(index * this.config.pageLength, index * this.config.pageLength + this.config.pageLength).filter(item => item)
      const msg = await this.formatMarketList(temp, { select: index + 1, total: maxPage })
      const ask = `[请选择对应操作]\n 上页 下页 跳页 1~${maxPage} 选择 货柜id 退出`
      await session.send(msg + ask)
      const action = await session.prompt(20000)
      // 操作验证环节
      if (action === undefined) {
        await session.send('选择超时,已结束商店查询')
        break;
      }
      if (action.trim() === '退出') {
        await session.send('已主动结束商店查询')
        break;
      }
      if (action.trim() === '下页') {
        if (index >= maxPage) {
          await session.send('已经是最后一页了')
        } else {
          index++
        }
        continue;
      }
      if (action.trim() === '上页') {
        if (index <= 0) {
          await session.send('已经是第一页了')
        } else {
          index--
        }
        continue;
      }
      // 用户选择查看详细
      if (action.trim().startsWith('选择')) {
        const params = action.trim().split(/\s+/)
        console.log(params);
        if (Number.isInteger(+params[1].trim())) {
          const id = +params[1].trim()
          if (id > 0) {
            const selectItem = temp.find((item) => item.id == id)
            if (selectItem) {
              await session.send(await this.formatMarketDetail(selectItem, averageList))
              break;
            } else {
              await session.send(`没有找到指定货柜id为${id}的商品\n操作结束;`)
              break;
            }
          } else {
            await session.send('下标选择有误,请重新输入')
            continue;
          }
        }
        await session.send('请 /选择 指定id')
        continue;
      }
      // 用户选择跳转指定页码
      if (action.trim().startsWith('跳页')) {
        const params = action.trim().split(/\s+/)
        console.log(params);
        if (Number.isInteger(+params[1].trim())) {
          const jupId = +params[1].trim()
          if (jupId > 0 && jupId - 1 <= maxPage) {
            index = jupId - 1
          } else {
            await session.send('跳页下标选择有误,请重新输入')
          }
          continue;
        }
        await session.send(`请 /跳页 指定1~${maxPage}页码`)
        continue;
      }
      await session.send('无效指令,请重新输入')
    }
  }
  /** 格式化传入店铺信息 */
  private async formatMarketList(marketList: UserMarketItem[], page?: { select: number, total: number }) {
    const img = await this.ctx.puppeteer.render(html.cerateMarket(marketList, page))
    return img
  }
  /** 格式化传入店铺详情 */
  private async formatMarketDetail(marketItem: UserMarketItem, averageList: { [key: string]: number }) {
    const img = await this.ctx.puppeteer.render(html.cerateMarketDetail(marketItem, averageList))
    return img + `以下是您选择的店铺,如需购买可发送 /商店购买 ${marketItem.id} 数量(可选)`
  }
  /** 更新用户本地数据 */
  private async updateUserMarketStore(userId: string) {
    const userData = this.marketList[userId] || []
    await this.ctx.localstorage.setItem(`${this.config.basePath}/${userId}`, JSON.stringify(userData))
  }
  /** 更新用户日志数据 */
  private async updateUserLogStore(userId: string) {
    const userData = this.userLogList[userId] || []
    await this.ctx.localstorage.setItem(`${this.config.logPath}/${userId}`, JSON.stringify(userData))
  }
  private async updateAccountStore(userId: string) {
    const accountData = this.accountList[userId] || { earnings: 0, logs: {} }
    await this.ctx.localstorage.setItem(`${this.config.accountPath}/${userId}`, JSON.stringify(accountData))
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.plugin(EconomyClass, config)
}
