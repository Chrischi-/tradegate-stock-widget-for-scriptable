/* --------------------------------------------------------------
Tradegate Stock Widget for https://scriptable.app 📈 by Chrischi-

Script: tradegate-stock-widget.js
Author: Chrischi
Version: 1.0.0
-------------------------------------------------------------- */

let smoothPath = 0
let stockInfo = []

//Widget Parameter: ISIN;EK;smoothPath eg. US6700024010;50.0;1

if(args.widgetParameter) {
  stockInfo = args.widgetParameter.split(";")
  if (stockInfo[0] === undefined) stockInfo[0] = "US6700024010" // novavax inc.
  if (stockInfo[1]) stockInfo[1] = parseFloat(stockInfo[1].replace(",", "."))
  if (stockInfo[2] === undefined) stockInfo[2] = "0"; else smoothPath = stockInfo[2]
} else {
  stockInfo[0] = ["US6700024010"] // novavax inc.
}

const Url = atob("aHR0cHM6Ly93d3cuY29uc29yc2JhbmsuZGU=")
const isinUrl = Url+"/web-financialinfo-service/api/marketdata/stocks?id="+stockInfo[0]+"&field=BasicV1&field=ExchangesV2"
const isinDataUrl = (location) => isinUrl
const isinData = await new Request(isinDataUrl()).loadJSON()
const consorsId = isinData[0].ExchangesV2[0].CONSORS_ID

let price_bid = isinData[0].ExchangesV2[0].PRICE
let stock_name = isinData[0].BasicV1.NAME_SECURITY
let symbol = isinData[0].BasicV1.ID.SYMBOL

const marketUrl = Url+"/web-financialinfo-service/api/marketdata/securities?id="+consorsId+"&field=ChartHistoryV1&idTypeOffset=51&historySince=0&resolution=15m&pagesize=2000&sortorder=DATETIME_FIRST"
const marketDataUrl = (location) => marketUrl

let widget = await createWidget()
if (!config.runsInWidget) {
  await widget.presentSmall()
}

Script.setWidget(widget)
Script.complete()

async function createWidget(items) {
  const marketdata = await new Request(marketDataUrl()).loadJSON()
  
  if(!marketdata) {
    const errorList = new ListWidget()
    errorList.addText("Keine Ergebnisse gefunden.")
    return errorList
  }

//------------------------------------------------
class LineChart {
  // LineChart by kevinkub with small modifications by me
  
  constructor(width, height, values) {
    this.ctx = new DrawContext()
    this.ctx.size = new Size(width, height)
    this.values = values;
  }
  
  _calculatePath() {
    let maxValue = Math.max(...this.values)+0.3;
    let minValue = Math.min(...this.values)-0.2;
    let difference = maxValue - minValue;
    let count = this.values.length;
    let step = this.ctx.size.width / (count - 1);
    let points = this.values.map((current, index, all) => {
        let x = step*index
        let y = this.ctx.size.height - (current - minValue) / difference * this.ctx.size.height;
        return new Point(x, y)
    });
    if (smoothPath == 1) return this._getSmoothPath(points);
    else
    return this._getPath(points);
  }
      
  _getSmoothPath(points) {
    let path = new Path()
    path.move(points[0]);
    path.addLine(points[0]);
    
    for(var i = 0; i < points.length-1; i ++) {
      let xAvg = (points[i].x + points[i+1].x) / 2;
      let yAvg = (points[i].y + points[i+1].y) / 2;
      let avg = new Point(xAvg, yAvg);
      let cp1 = new Point((xAvg + points[i].x) / 2, points[i].y);
      let next = new Point(points[i+1].x, points[i+1].y);
      let cp2 = new Point((xAvg + points[i+1].x) / 2, points[i+1].y);   
      path.addQuadCurve(avg, cp1);             
      path.addQuadCurve(next, cp2);
    }
    return path;
  }
    
   _getPath(points) {
    let path = new Path()
    path.move(points[0]);
    path.addLine(points[0]);  
    for(var i = 0; i < points.length-1; i ++) {
      path.addLine(points[i]);
    }
    return path;
  }
  
  configure(fn) {
    let path = this._calculatePath()
    if(fn) {
      fn(this.ctx, path);
    } else {
      this.ctx.addPath(path);
      this.ctx.strokePath(path);
    }
    return this.ctx;
  }

}
//------------------------------------------------

  
  let attr = price_bid
  if (typeof attr === 'string') attr = parseFloat(attr.replace(",", "."))
  
  let trend
  let color
  
  if (stockInfo[1] > 0) {
  if(attr >= stockInfo[1]) {
    trend = '↑'
    color = Color.green()
  } else if(attr >= stockInfo[1]-10) {
    trend = '→'
    color = Color.orange()
  } else {
    trend = '↓'
    color = Color.red()
  }
  } else {
    color = Color.white()
  }
  
  const list = new ListWidget()
  let startColor = new Color("#191a19")
  let endColor = new Color("#0d0d0d")
  let gradient = new LinearGradient()
  gradient.colors = [startColor, endColor] 
  gradient.locations = [0.1, 1] 
  list.backgroundGradient = gradient
  
  list.addSpacer(3)
  
  let titleStack = list.addStack()
  const header = titleStack.addText(symbol.toUpperCase())
  header.font = Font.boldSystemFont(15)
  header.textColor = Color.white()
  
  titleStack.addSpacer()
  
  if (stockInfo[1] > 0) {
  let change = Math.round((100*attr)/stockInfo[1]-100)
  trend = (trend+" "+change+"%").slice(-7)
  const label_nxt = titleStack.addText(trend)
  label_nxt.textColor = color
  label_nxt.font = Font.boldSystemFont(13)
  }
  const subheader = list.addText(stock_name.toLowerCase())
  subheader.font = Font.mediumSystemFont(13)
  subheader.textColor = Color.gray()
  
  list.addSpacer(17)
  let timeline = []
  let size = marketdata[0].ChartHistoryV1.TOTAL_AMOUNT-1
  if (size>0){
  for (var i = 0;; i++) {
    timeline.push(marketdata[0].ChartHistoryV1.ITEMS[i].LAST);
    if (i == size) break;
  }
}else{
  timeline=[0]
} 
  let chart = new LineChart(535, 80, timeline).configure((ctx, path) => {
    ctx.opaque = false;
    ctx.setStrokeColor(color);
    ctx.setLineWidth(5.5);
    ctx.addPath(path);
    ctx.strokePath(path);
  }).getImage();
  let chartStack = list.addStack()
  let img = chartStack.addImage(chart)
  img.applyFittingContentMode()
  
  list.addSpacer(10)
  
  const label = list.addText(attr.toFixed(2)+"")
  label.font = Font.regularSystemFont(46)
  label.rightAlignText()
  label.minimumScaleFactor = 0.80
  label.textColor = color
  
  return list
}
