/** 上架状态 */
export enum StorageStatus {
    待上架 = 0,
    已上架 = 1,
    已锁定 = 2,
    已完成 = 3,
    已下架 = 4
}

/** 商品类型 */
export enum PropType {
    丹药 = 0,
    药材 = 1,
    装备 = 2,
    功法 = 3,
    神通 = 4
}

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
    type: PropType
}

/** 日志条款 */
export type logsItem = {
    /** 商品名 */
    name: string,
    /** 总数 */
    total: number,
    /** 上架时间 */
    time: number,
    /** 上架者 */
    for: string,
    /** 状态 */
    type: number
}