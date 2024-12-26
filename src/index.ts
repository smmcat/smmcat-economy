import { Context, Schema, Session, Service } from 'koishi'
import { } from 'koishi-plugin-smmcat-localstorage'
import { } from 'koishi-plugin-puppeteer'
import path from 'path'
import fs from 'fs/promises'
import type { UserMarketItem } from './type'
import { PropType, StorageStatus } from './type'
import { html } from './html'

export const name = 'smmcat-economy'

export interface Config {
  botId: string,
  basePath: string
  logPath: string
  debug: boolean
  sellAwaitTime: number
  shelfLifeTime: number
  pageLength: number
  currencyName: string
}

export const inject = ['localstorage', 'puppeteer']

export const Config: Schema<Config> = Schema.object({
  botId: Schema.string().default('').description('QQbot的id 用于获取玩家头像'),
  basePath: Schema.string().default('common-market').description('店铺信息文件存放位置'),
  logPath: Schema.string().default('common-market-log').description('用户交易日志存放地址'),
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
  lastId: number
  private events: { [key: string]: Function[] };
  constructor(ctx: Context, config: Config) {
    super(ctx, 'economy', true);
    /** 商店数据列表 */
    this.marketList = {}
    /** 日志列表 */
    this.userLogList = {}
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
      .command('数据更新')
      .action(async ({ session }) => {
        console.log(this.events);
        const data = [
          {
            id: 1,
            pic: 'https://smmcat.cn/run/fish/props/64/%E7%8C%AA%E8%84%9A%E9%A5%AD.png',
            userId: '04AC3F668B01A755BF2553FD3C705735',
            username: 'smm',
            name: '猪脚饭',
            total: 1,
            price: 243,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.神通
          },
          {
            id: 2,
            pic: 'https://smmcat.cn/run/fish/props/64/水果鸡肉.png',
            userId: '4394C94A32E77BE7F9DBDFDE6B00E1ED',
            username: '我是桂',
            name: '北京尻鸭',
            total: 1,
            price: 650,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.丹药
          }, {
            id: 3,
            pic: 'https://smmcat.cn/run/fish/props/64/水果鸡肉.png',
            userId: '4394C94A32E77BE7F9DBDFDE6B00E1ED',
            username: '自由♂',
            name: '北京尻鸭',
            total: 1,
            price: 210,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.神通
          }, {
            id: 4,
            pic: 'https://smmcat.cn/run/fish/props/64/%E7%8C%AA%E8%84%9A%E9%A5%AD.png',
            userId: '4394C94A32E77BE7F9DBDFDE6B00E1ED',
            username: 'smm',
            name: '猪脚饭',
            total: 1,
            price: 250,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.丹药
          }, {
            id: 5,
            pic: 'https://smmcat.cn/run/fish/props/64/石锅拌饭.png',
            userId: 'E74A15263A4F701829B1244EC92CA9EA',
            username: '尻川',
            name: '今麦浪',
            total: 13,
            price: 250,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.功法
          },
          {
            id: 6,
            pic: 'https://smmcat.cn/run/fish/props/64/%E7%8C%AA%E8%84%9A%E9%A5%AD.png',
            userId: '04AC3F668B01A755BF2553FD3C705735',
            username: 'smm',
            name: '猪脚饭',
            total: 10,
            price: 230,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.神通
          },
          {
            id: 7,
            pic: 'https://smmcat.cn/run/fish/props/64/水果鸡肉.png',
            userId: '4394C94A32E77BE7F9DBDFDE6B00E1ED',
            username: '我是桂',
            name: '北京尻鸭',
            total: 1,
            price: 650,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.丹药
          }, {
            id: 8,
            pic: 'https://smmcat.cn/run/fish/props/64/%E7%8C%AA%E8%84%9A%E9%A5%AD.png',
            userId: '7FF251EF31F3CD31A54ECA1672CA120B',
            username: '自由♂',
            name: '猪脚饭',
            total: 1,
            price: 210,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.神通
          }, {
            id: 9,
            pic: 'https://smmcat.cn/run/fish/props/64/%E7%8C%AA%E8%84%9A%E9%A5%AD.png',
            userId: '04AC3F668B01A755BF2553FD3C705735',
            username: 'smm',
            name: '猪脚饭',
            total: 1,
            price: 209,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.丹药
          }, {
            id: 10,
            pic: 'https://smmcat.cn/run/fish/props/64/石锅拌饭.png',
            userId: 'E74A15263A4F701829B1244EC92CA9EA',
            username: '尻川',
            name: '今麦浪',
            total: 1,
            price: 250,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.功法
          },
          {
            id: 11,
            pic: 'https://smmcat.cn/run/fish/props/64/%E7%8C%AA%E8%84%9A%E9%A5%AD.png',
            userId: '04AC3F668B01A755BF2553FD3C705735',
            username: 'smm',
            name: '猪脚饭',
            total: 1,
            price: 233,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.神通
          },
          {
            id: 12,
            pic: 'https://smmcat.cn/run/fish/props/64/石锅拌饭.png',
            userId: '4394C94A32E77BE7F9DBDFDE6B00E1ED',
            username: '我是桂',
            name: '北京尻鸭',
            total: 1,
            price: 650,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.丹药
          }, {
            id: 13,
            pic: 'https://smmcat.cn/run/fish/props/64/%E7%8C%AA%E8%84%9A%E9%A5%AD.png',
            userId: '7FF251EF31F3CD31A54ECA1672CA120B',
            username: '自由♂',
            name: '猪脚饭',
            total: 1,
            price: 270,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.神通
          }, {
            id: 14,
            pic: 'https://smmcat.cn/run/fish/props/64/%E7%8C%AA%E8%84%9A%E9%A5%AD.png',
            userId: '04AC3F668B01A755BF2553FD3C705735',
            username: 'smm',
            name: '猪脚饭',
            total: 1,
            price: 250,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.丹药
          }, {
            id: 15,
            pic: 'https://smmcat.cn/run/fish/props/64/石锅拌饭.png',
            userId: 'E74A15263A4F701829B1244EC92CA9EA',
            username: '尻川',
            name: '今麦浪',
            total: 1,
            price: 250,
            time: 1735048892467,
            status: StorageStatus.已上架,
            type: PropType.功法
          }
        ]

        const userIdList = {}
        data.forEach((item) => {
          if (!userIdList[item.userId]) {
            userIdList[item.userId] = []
          }
          userIdList[item.userId].push(item)
        })
        this.marketList = userIdList
        return `数据更新完成`
      })


    this.ctx
      .command('测试内容 <type>')
      .action(async ({ session }, type) => {
        if (type && Object.values(PropType).includes(type)) {
          await this.getMarketList(session, PropType[type])
          return
        }
        await this.getMarketList(session)
      })

    ctx
      .command('商店购买 <shopId:number> <quantity:number>')
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
  }
  /** 接收事件 */
  public on(event: string, callback: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  /** 触发事件 */
  public async emit(event: string, eventData?: any): Promise<void> {
    if (this.events[event]) {
      await Promise.all(this.events[event].map(callback => Promise.resolve(callback(eventData))))
    }
  }
  /** 商店初始化 */
  private async init() {
    const upath = path.join(this.ctx.localstorage.basePath, this.config.basePath)
    const logPath = path.join(this.ctx.localstorage.basePath, this.config.logPath)
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
    const marketTemp: { [key: string]: UserMarketItem[] } = {}
    const logTemp = {}
    const status = { market: { ok: 0, err: 0 }, log: { ok: 0, err: 0 } }
    const eventList = (await fs.readdir(upath)).map((item) => {
      return new Promise(async (resolve, reject) => {
        try {
          marketTemp[item] = JSON.parse(await this.ctx.localstorage.getItem(`${this.config.basePath}/${item}`))
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
    await Promise.all(eventList)
    await Promise.all(eventLogList)
    console.log(`交易市场数据初始化完成,加载成功${status.market.ok}个用户数据,失败${status.market.err}个用户数据`);
    console.log(`交易市场日志初始化完成,加载成功${status.log.ok}个用户数据,失败${status.log.err}个用户数据`);
  }
  /** 更新市场状态 */
  private updateMarket() {
    /** 获取所有店铺信息 */
    const allMarket: UserMarketItem[] = []
    Object.keys(this.marketList).map((item: string) => {
      let isUp = false
      const nowTime = +new Date()
      // 遍历待上架状态商品
      this.marketList[item].forEach((item: UserMarketItem) => {
        // 是否需要上架
        if (item.status == StorageStatus.待上架 && nowTime - item.time > this.config.sellAwaitTime) {
          // 通知更新
          isUp = true
          // 通知上架
          item.status = StorageStatus.已上架
        }
        // 是否需要下架
        if (item.status == StorageStatus.已上架 && nowTime - item.time > this.config.shelfLifeTime) {
          // 通知更新
          isUp = true
          // 通知下架
          item.status = StorageStatus.已下架
        }
      })
      /** 更新本地数据 */
      isUp && this.updateUserMarketStore(item)
      /** 添加至全局数据 */
      allMarket.push(...this.marketList[item])
    })
    return allMarket
  }
  // 购买商店中的某个商品
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
      /** 操作完成后,请改为 true */
      isBuy: false
    }
    await this.emit('buying', { session, upValue: temp })
    if (!temp.isBuy) {
      await session.send('购买失败')
      return
    }
    await session.send('店铺系统收到回调,操作成功!正在整理店铺信息')
    item.total -= quantity
    if (item.total <= 0) {
      item.status = StorageStatus.已下架
    }
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
  private async getMarketList(session: Session, filter: PropType | -1 = -1) {

    let allMarket: UserMarketItem[] = this.updateMarket().filter((item: UserMarketItem) => item.status == StorageStatus.已上架)
      .sort((a: UserMarketItem, b: UserMarketItem) => b.time - a.time)

    // 平均价列表
    const averageList: { [key: string]: number } = this.getAveragePrice(allMarket)

    // 如果需要过滤
    if (filter !== -1) {
      allMarket = allMarket.filter((item) => item.type === filter)
    }
    const emitList = { allMarket, session, list: [] }
    // 发送 getMarket 事件
    await this.emit('getMarket', emitList)
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
}

export function apply(ctx: Context, config: Config) {
  ctx.plugin(EconomyClass, config)
}
