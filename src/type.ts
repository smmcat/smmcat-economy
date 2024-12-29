import { Session } from "koishi";

/** 上架状态 */
export enum StorageStatus {
    待上架 = 0,
    已上架 = 1,
    已锁定 = 2,
    已完成 = 3,
    已下架 = 4
}

export enum LogStatus {
    上架 = 0,
    下架 = 1,
    购买 = 2,
    卖出 = 3
}

/** 商品类型 */
// export enum PropType {
//     丹药 = 0,
//     药材 = 1,
//     装备 = 2,
//     功法 = 3,
//     神通 = 4
// }

export interface Economy_EventData<T> {
    session: Session;
    by: string;
    upValue: T;
    isOver?: boolean
}

export interface Economy_DelistData {
    upValue: {
        total: number,
        price: number,
        by: string,
        name: string
    }[],
    isRecycle: boolean
}

export type Economy_BuyEventData = {
    /** 商品配图 */
    pic: string,
    /** 商品名 */
    name: string,
    /** 购买数量 */
    quantity: number,
    /** 商品单价 */
    price: number,
    /** 商品总价 */
    total: number,
    /** 委派标识 该购买事件会传给对应设置标识的插件 */
    by: string,
    /** 操作完成后,请改为 true */
    isBuy: boolean
}

export type SellingUpData = {
    /** 物品配图 */
    pic: string,
    /** 物品名称 */
    name: string,
    /** 物品总数 */
    total: number,
    /** 物品单价 */
    price: number,
    /** 物品来源 */
    by: string,
    /** 物品类型 */
    type: number,
    /** 是否完成配置 */
    isSell: boolean
}

export type Economy_RecycleData = {
    total: number,
    price: number,
    by: string,
    name: string
}[]

/** 商品清单 */
export type UserMarketItem = {
    /** 标识 */
    id: number,
    /** 配图 */
    pic: string | null,
    /** 来源 */
    userId: string,
    /** 用户名 */
    username: string,
    /** 商品名称 */
    name: string,
    /** 商品总数 */
    total: number,
    /** 商品单价 */
    price: number,
    /** 上架时间 */
    time: number,
    /** 商品状态 */
    status: StorageStatus,
    /** 商品类型 */
    type: string
    /** 商品来源 */
    by: string
}

/** 日志条款 */
export type logsItem = {
    /** 商品名 */
    name: string,
    /** 总数 */
    total: number,
    /** 记录时间 */
    time: number,
    /** 目标者 */
    for: string,
    /** 类型 */
    type: LogStatus,
    /** 单价 */
    price: number
}