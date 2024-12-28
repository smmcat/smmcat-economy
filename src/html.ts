import type { UserMarketItem } from './type'
import {  StorageStatus } from './type'

export const html = {
    botId: '',
    currencyName: '灵石',
    countdownTime: 0,
    cerateMarket(marketList: UserMarketItem[], page?: { select: number, total: number }) {
        const pageHtml = []
        for (let i = 0; i < page.total; i++) {
            pageHtml.push(`<span class="${(i + 1) == page.select ? 'select' : ''}">${i + 1}</span>`)
        }
        return `
      <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>市场列表</title>
    <style>
        body,
        html {
            margin: 0;
            padding: 0;
            display: flex;
            width: 800px;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
            background-color: #f9f9f9;
        }

        .content {
            width: 100%;
            margin: 20px auto;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
        }

        h4 {
            text-align: center;
            color: #333;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        table th:nth-child(1) {
            width: 10%;
        }

        table th:nth-child(2) {
            width: 15%;
        }

        table th:nth-child(3) {
            width: 10%;
        }

        table th:nth-child(4) {
            width: 10%;
        }

        table th:nth-child(5) {
            width: 20%;
        }

        table th:nth-child(6) {
            width: 15%;
        }

        table th:nth-child(7) {
            width: 20%;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: center;
        }

        td {
            font-size: 12px;
        }

        th {
            background-color: #4CAF50;
            color: white;
        }

        tr:nth-child(even) {
            background-color: #f2f2f2;
        }

        .avatar {
            vertical-align: middle;
            width: 30px;
            height: 30px;
            margin-right: 5px;
            border-radius: 50%;
            object-fit: cover;
        }
        .props {
            vertical-align: middle;
            width: 30px;
            height: 30px;
            margin-left: 5px;
        }
        td.time {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        a.countdown {
            display: inline-block;
            transform: scale(0.9);
            font-size: 12px;
            color: #878787;
            padding: 2px 5px;
            text-decoration: none;
            white-space: nowrap;
        }
        a.countdown.red {
            color:rgb(207, 65, 65);
        }

        .page {
            box-sizing: border-box;
            display: flex;
            margin-top: 10px;
            height: 22px;
            width: 100%;
            justify-content: center;
            align-items: center;
        }
        .page span {
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 12px;
            width: 20px;
            height: 20px;
            margin: 0 5px;
            border: 1px solid #777676;
        }

        .page span.select {
            color: #fff;
            background-color: #4CAF50;
        }
    </style>
</head>

<body>
    <div class="content">
        <h4>市场列表</h4>
        <table>
            <thead>
                <tr>
                    <th>货柜id</th>
                    <th>道具名称</th>
                    <th>类型</th>
                    <th>数量</th>
                    <th>卖家</th>
                    <th>价格</th>
                    <th>上架时间</th>
                </tr>
            </thead>
            <tbody>
            ${marketList.map((item) => {
            return `<tr>
                    <td>${item.id}</td>
                    <td>${item.name}${item.pic ? `<img class="props" src="${item.pic}"/>` : ''}</td>
                    <td>${item.type}</td>
                    <td>${item.total}</td>
                    <td>
                        <img src="http://q.qlogo.cn/qqapp/${this.botId}/${item.userId}/640"
                            class="avatar">
                        ${item.username}
                    </td>
                    <td>${item.price} ${this.currencyName}</td>
                    <td class="time">${uilts.formatTimestamp(item.time)}  ${uilts.countdown(item.time)}</td>
                </tr>`
        }).join('')}
            </tbody>
        </table>
        ${page ? `<div class="page">${pageHtml.join('')}</div>` : ""}
    </div>
</body>

</html>
      `
    },
    cerateMarketDetail(marketInfo: UserMarketItem, averageList: { [key: string]: number }) {
        let undulate = ''
        if (marketInfo.price > averageList[marketInfo.name]) {
            undulate = `<a class="countdown red" href="JavaScript:;">↑ 市场价 ${averageList[marketInfo.name]} ${this.currencyName}</a>`
        } else if (marketInfo.price < averageList[marketInfo.name]) {
            undulate = `<a class="countdown green" href="JavaScript:;">↓ 市场价 ${averageList[marketInfo.name]} ${this.currencyName}</a>`
        } else {
            undulate = `<a class="countdown gray" href="JavaScript:;">— 市场价 ${averageList[marketInfo.name]} ${this.currencyName}</a>`
        }
        return `
     <!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" width="device-width" initial-scale="1.0">
    <title>商品详情</title>
    <style>
        /* 全局样式 */
        body,html {
            font-family: 'Roboto', sans-serif;
            width: 800px;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }

        /* 容器样式 */
       .container {
            max-width: 800px;
            box-sizing: border-box;
            margin: 30px auto;
            padding: 20px;
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: row;
            align-items: flex-start;
        }

        /* 商品信息区域样式 */
       .product-info {
            flex: 1;
            padding: 20px;
        }

       .product-info > div {
            display: grid;
            grid-template-columns: 1fr 3fr;
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 12px;
            margin-bottom: 10px;
        }

        h1 {
            color: #343a40;
            text-align: left;
            font-size: 32px;
            letter-spacing: 1px;
            margin-bottom: 20px;
        }

        /* 商品图片框样式 */
       .product-image-box {
            overflow: hidden;
            width: 300px;
            height: 423px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 15px;
            border: 1px dashed #dee2e6;
            margin-left: 20px;
        }

       .product-image {
            width: 90%;
            height: auto;
            object-fit: cover;
        }

        /* 价格样式 */
       .price {
            font-size: 24px;
            color: #e74c3c;
            font-weight: bold;
            margin: 10px 0;
        }

        /* 状态样式 */
       .status {
            font-weight: bold;
            color: #2ecc71;
        }

        /* 信息项通用样式 */
       .info-item {
            margin: 10px 0;
        }

       .info-label {
            font-weight: bold;
            color: #6c757d;
        }

        /* 用户信息区域样式 */
       .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 10px;
            vertical-align: middle;
            border: 2px solid #ffffff;
            transition: all 0.3s ease;
        }

       .avatar:hover {
            transform: scale(1.1);
        }

       .user-info {
            display: flex;
            align-items: center;
        }

        /* 用户名样式 */
        #username {
            font-size: 16px;
            color: #343a40;
            word-break: break-all;
        }
        a.countdown {
            display: inline-block;
            transform: scale(0.9);
            font-size: 12px;
            color: #878787;
            padding: 2px 5px;
            text-decoration: none;
            white-space: nowrap;
        }
        a.countdown.red {
            color:rgb(207, 65, 65);
        }
        a.countdown.green {
            color:rgb(0, 161, 94);
        } 
        a.countdown.gray {
            color:rgb(67, 69, 68);
        }         
    </style>
</head>

<body>
    <div class="container">
        <div class="product-info">
            <h1 id="product-name">商品名称: <span>${marketInfo.name}</span></h1>
            <div class="info-item"><span class="info-label">店铺id</span> <span id="total">${marketInfo.id}</span></div>
            <div class="info-item user-info">
                <span class="info-label">来源:</span>
                <span>
                    <span id="user-id">${marketInfo.userId.length > 8 ? marketInfo.userId.slice(0, 8) + `...` : marketInfo.userId}</span>
                    <img id="user-avatar" class="avatar" src="${`http://q.qlogo.cn/qqapp/${this.botId}/${marketInfo.userId}/640`}" alt="用户头像" /> 
                    (用户名: <span id="username">${marketInfo.username || ''}</span>)
                </span>
            </div>
            <div class="info-item"><span class="info-label">总数:</span> <span id="total">${marketInfo.total}</span></div>
            <div class="info-item"><span class="info-label">单价:</span><span id="price">${marketInfo.price} ${this.currencyName} ${undulate}</div>
            <div class="info-item"><span class="info-label">上架时间:</span> <span class="time">${uilts.formatTimestamp(marketInfo.time)} ${uilts.countdown(marketInfo.time)}</span></div>
            <div class="info-item"><span class="info-label">商品状态:</span> <span id="status" class="status">${StorageStatus[marketInfo.status]}</span></div>
            <div class="info-item"><span class="info-label">商品类型:</span> <span id="type">${marketInfo.type}</span></div>
        </div>
        ${marketInfo.pic ? `
            <div class="product-image-box">
            <img id="product-pic" class="product-image" src="${marketInfo.pic}" alt="商品图片" />
        </div>
        `: ''}
    </div>
</body>

</html>
     `
    }
}

const uilts = {
    formatTimestamp(timestamp: number) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        // const hours = String(date.getHours()).padStart(2, '0');
        // const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    countdown(time: number, addTag = true): string {
        console.log(+new Date());

        const timestamp = (html.countdownTime - (+new Date() - time)) / 1000;
        const days: number = Math.floor(timestamp / 86400);
        const hours: number = Math.floor((timestamp % 86400) / 3600);
        const minutes: number = Math.floor((timestamp % 3600) / 60);
        if (days >= 7) {
            const weeks: number = Math.floor(days / 7);
            const remainingDays: number = days % 7;
            return addTag ? `<a class="countdown"距下架 ${weeks}周 ${remainingDays}天 ${hours}时 ${minutes}分</a>` :
                `距下架 ${weeks}周 ${remainingDays}天 ${hours}时 ${minutes}分`;
        } else if (days >= 1) {
            return addTag ? `<a class="countdown" href="JavaScript:;">距下架 ${days}天 ${hours}时 ${minutes}分</a>` :
                `距下架 ${days}天 ${hours}时 ${minutes}分`;
        } else {
            return addTag ? `<a class="countdown red" href="JavaScript:;">距下架 ${hours}时 ${minutes}分</a>` :
                `距下架 ${hours}时 ${minutes}分`;
        }
    }
}