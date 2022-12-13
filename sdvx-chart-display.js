//@ts-check
(function () {
    //定数項
    class Const {
        static TOTAL_LANE_WIDTH = 400//レーン部分の幅
        static LASER_LANE_WIDTH = Const.TOTAL_LANE_WIDTH / 8//レーザーレーン幅
        static LASER_WIDTH = Const.LASER_LANE_WIDTH//レーザー幅
        static LASER_VERTICAL_HEIGHT = 36//レーザー直角高さ
        static LASER_END_HEIGHT = 64//レーザー直角終端の高さ
        static LINE_WIDTH = 4//線の幅
        static SINGLE_LANE_WIDTH = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH * 2) / 4//BTレーン1つの幅
        static CHIP_BT_WIDTH = Const.SINGLE_LANE_WIDTH - 4//レーン幅から両側2縮小
        static LONG_BT_WIDTH = Const.SINGLE_LANE_WIDTH - 16//レーン幅から両側8縮小
        static CHIP_FX_WIDTH = Const.SINGLE_LANE_WIDTH * 2 - 4//レーン幅から両側2縮小
        static LONG_FX_WIDTH = Const.SINGLE_LANE_WIDTH * 2 - 2//レーン幅から片側2縮小
        static CHIP_BT_HEIGHT = 24//チップBTの高さ
        static CHIP_FX_HEIGHT = 24//チップFXの高さ
        static BAR_HEIGHT = 72 * 16// 4/4の1小節の長さ　16分の高さを決めて16倍
        static MARGIN_HEIGHT_UPPER = Const.BAR_HEIGHT * 1 / 16//上に16分だけ余白
        static MARGIN_HEIGHT_LOWER = Const.BAR_HEIGHT * 1 / 16//下に16分だけ余白
        static BPM_WIDTH = 80

        static LANE_BT_COLOR = "#000"
        static LANE_VOL_L_COLOR = "rgba(0,127,255,0.2)"
        static LANE_VOL_R_COLOR = "rgba(255,0,127,0.2)"
        static LANE_VOL_L_BORDER_COLOR = "rgb(0,127,255)"
        static LANE_VOL_R_BORDER_COLOR = "rgb(255, 127, 255)"
        static LANE_BT_BORDER_COLOR = "#888"
        static BAR_LINE_COLOR = "#888"
        static VOL_L_COLOR = "rgba(0, 127, 255, 0.6)"
        static VOL_L_BORDER_COLOR = "rgb(0, 255, 255)"
        static VOL_R_COLOR = "rgba(255, 0, 127, 0.6)"
        static VOL_R_BORDER_COLOR = "rgb(255, 127, 255)"
        static LONG_FX_COLOR = "rgba(255,102,0,0.8)"
        static LONG_BT_COLOR = "#fff"
        static CHIP_FX_SE_COLOR = "#fa0"
        static CHIP_FX_COLOR = "rgb(255,102,0)"
        static CHIP_BT_COLOR = "#fff"
        static BPM_NORMAL_COLOR = "#fff"
        static BPM_UPPER_COLOR = "#f88"
        static BPM_LOWER_COLOR = "#88f"
        static BPM_FONT = "48px system-ui"

    }
    // (実質的な)グローバル変数
    /**
     * @type {number}
     */
    let TotalHeight;//画像全体の高さ　譜面の長さを参照して変動
    /**
     * @type {number}
     */
    let TotalWidth;//画像全体の幅　レーザーのはみ出し度合いを参照して変動
    //分数クラス
    class Fraction {
        constructor(...args) {
            /** @type {number} */
            this.numerator//分子
            /** @type {number} */
            this.denominator//分母
            if (args.length == 1 && typeof args[0] === "string" && /[+-]?\d+\/[+-]?\d+/.test(args[0])) {//分数の形式に沿った文字列
                [this.numerator, this.denominator] = args[0].split("/").map((n) => Number(n))
            } else if (args.length == 2 && typeof args[0] === "number" && typeof args[1] === "number") {//分子,分母
                this.numerator = args[0]
                this.denominator = args[1]
            } else if (args.length == 0) {//引数なしでインスタンス化すると0/1に
                this.numerator = 0
                this.denominator = 1
            } else {
                console.error(`${args}は分数に変換できません`)
            }
        }
        toNumber() {//数値へ変換
            return this.numerator / this.denominator
        }
        toString() {//文字列へ変換
            return `${this.numerator}/${this.denominator}`
        }
        /**
         * @param {string} string
         */
        static stringToNumber(string) {//文字列を数値へ変換
            return new Fraction(string).toNumber()
        }
        /** 
         * @param {Fraction} fraction1
         * @param {Fraction} fraction2
        */
        static Equal(fraction1, fraction2) {//2つの分数が同じ値を指しているか判定
            return Math.round(fraction1.numerator * fraction2.denominator) == Math.round(fraction2.numerator * fraction1.denominator)
        }
        /** 
         * @param {any} target
        */
        static isFraction(target) {//分数として解釈できる文字列か判定
            return typeof target === "string" && /[+-]?\d+\/[+-]?\d+/.test(target)
        }
        /** 
         * @param {Fraction[]} fracs
        */
        static Max(...fracs) {//最大のものを返す
            return fracs.reduce((fa, fb) => fa.numerator * fb.denominator > fb.numerator * fa.denominator ? fa : fb)
        }
        /** 
         * @param {Fraction[]} fracs
        */
        static Min(...fracs) {//最小のものを返す
            return fracs.reduce((fa, fb) => fa.numerator * fb.denominator < fb.numerator * fa.denominator ? fa : fb)
        }
    }
    /** 
     * @param {any[]} array
     * @param {number} n
     * @returns {string[][]}//便宜上
    */
    //配列をn個ずつに分割する関数
    const split = (array, n) => array.reduce((a, c, i) => i % n == 0 ? [...a, [c]] : [...a.slice(0, -1), [...a[a.length - 1], c]], [])


    /**
     * @type {NodeListOf<HTMLCanvasElement>}
    */
    const charts = document.querySelectorAll(".chartImage")
    charts.forEach((c) => {
        showChart(c)
    })
    //canvasに譜面画像を描く
    /**
     * 
     * @param {HTMLCanvasElement} chartCanvas
     */
    function showChart(chartCanvas) {
        chartCanvas.width = 0
        chartCanvas.height = 0
        if (chartCanvas.getContext) {
            const objects = chartCanvas.getAttribute("data-chart")
                .split(";")
                .map((s) => s.trim())
                .filter((s) => s)
                .map((o) => o.split(",")
                    .map((st) => st.trim())
                    .filter((st) => st)
                )//スペースとsplit後の空文字をここで削除しているため、スペースや余分な区切り文字を入れても機能する
            const bpm_data = objects.filter((d) => d[0] == "BPM").flatMap((d) => split(d.slice(1), 2))//[[BPM,タイミング],[BPM,タイミング],…]
            const long_data = objects.filter((d) => d[0] == "LONG").flatMap((d) => split(d.slice(1), 3))//[[押すボタン,始点タイミング,終点タイミング],[押すボタン,始点タイミング,終点タイミング],…]
            const chip_data = objects.filter((d) => d[0] == "CHIP").flatMap((d) => split(d.slice(1), 2))//[[押すボタン,タイミング],[押すボタン,タイミング],…]
            const vol_point_data = objects.filter((d) => d[0] == "VOL").flatMap((d) => split(d.slice(1), 3))//[[レーザーの形,終点タイミング,終点レーン位置],[レーザーの形,終点タイミング,終点レーン位置],…]
            const all_data = [...bpm_data, ...long_data, ...chip_data, ...vol_point_data]
            const last_pos =
                Fraction.Max(...
                    all_data
                        .flatMap((ds) =>
                            ds.filter((s) => Fraction.isFraction(s))
                                .map((s) => new Fraction(s))
                        ))
                    .toNumber()//canvasの高さ決定に使う、最後の譜面要素の位置

            TotalHeight = Const.BAR_HEIGHT * last_pos + Const.MARGIN_HEIGHT_UPPER + Const.MARGIN_HEIGHT_LOWER//canvasの高さ
            const vols_lanes = vol_point_data.map((ds) => Number(ds[2]))//canvasの幅決定に使う、レーザーの配置されたレーン位置
            const bpm_exists = bpm_data.length > 0
            TotalWidth =
                Math.max(
                    Math.max(
                        Math.abs(vols_lanes.reduce((a, b) => Math.max(a, b), 1) - 0.5),
                        Math.abs(vols_lanes.reduce((a, b) => Math.min(a, b), 0) - 0.5),
                        0.5) * 2 * Const.TOTAL_LANE_WIDTH,
                    Const.TOTAL_LANE_WIDTH + Const.BPM_WIDTH * 2 * Number(bpm_exists))//-0.5～1.5を-1～1に補正し、絶対値の最大値の2倍（両側）だけ表示幅を広げる
            chartCanvas.setAttribute("width", `${TotalWidth}px`);
            chartCanvas.setAttribute("height", `${TotalHeight}px`);
            const ctx = chartCanvas.getContext('2d');
            // 背景を描く
            drawBackground(ctx)
            //オブジェクトを描く
            placeLongs(ctx, long_data)
            const vol_data = objects.filter((d) => d[0] == "VOL").map((d) => split(d.slice(1), 3))
            placeVols(ctx, vol_data)
            placeChips(ctx, chip_data)
            placeBpm(ctx, bpm_data)
        } else {
            // キャンバスに未対応の場合の処理
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {boolean} forVolL
     * @param {boolean} forVolR
     */
    function setTransform(ctx, forVolL, forVolR) {
        if (forVolL) {//原点を左下に
            ctx.setTransform(1, 0, 0, -1, (TotalWidth - Const.TOTAL_LANE_WIDTH) / 2, TotalHeight - Const.BAR_HEIGHT / 16);//左端を原点にする
        } else if (forVolR) {//原点を右下に
            ctx.setTransform(-1, 0, 0, -1, TotalWidth - (TotalWidth - Const.TOTAL_LANE_WIDTH) / 2, TotalHeight - Const.BAR_HEIGHT / 16);//右端を原点にする
        } else {//原点を中央下に
            ctx.setTransform(1, 0, 0, -1, TotalWidth / 2, TotalHeight - Const.BAR_HEIGHT / 16);//Y軸反転、図中のX軸中央、Y軸下端から16分1個空けたところに原点移動
        }
    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    function drawBackground(ctx) {//背景を描く
        ctx.setTransform(1, 0, 0, -1, (TotalWidth - Const.TOTAL_LANE_WIDTH) / 2, TotalHeight);
        ctx.fillStyle = Const.LANE_BT_COLOR
        ctx.fillRect(0, 0, Const.TOTAL_LANE_WIDTH, TotalHeight)//BTレーン
        ctx.fillStyle = Const.LANE_VOL_L_COLOR
        ctx.fillRect(0, 0, Const.LASER_LANE_WIDTH, TotalHeight)//青レーザーレーン
        ctx.fillStyle = Const.LANE_VOL_R_COLOR
        ctx.fillRect(Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH, 0, Const.LASER_LANE_WIDTH, TotalHeight)//赤レーザーレーン
        ctx.lineWidth = Const.LINE_WIDTH
        ctx.strokeStyle = Const.LANE_VOL_L_BORDER_COLOR
        ctx.beginPath()
        ctx.moveTo(Const.LASER_LANE_WIDTH, 0)
        ctx.lineTo(Const.LASER_LANE_WIDTH, TotalHeight)
        ctx.moveTo(0, 0)
        ctx.lineTo(0, TotalHeight)
        ctx.stroke()//青レーザーレーン縁
        ctx.strokeStyle = Const.LANE_VOL_R_BORDER_COLOR
        ctx.beginPath()
        ctx.moveTo(Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH, 0)
        ctx.lineTo(Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH, TotalHeight)
        ctx.moveTo(Const.TOTAL_LANE_WIDTH, 0)
        ctx.lineTo(Const.TOTAL_LANE_WIDTH, TotalHeight)
        ctx.stroke()//赤レーザーレーン縁
        ctx.strokeStyle = Const.LANE_BT_BORDER_COLOR
        ctx.beginPath()
        ctx.moveTo(Const.LASER_LANE_WIDTH + Const.SINGLE_LANE_WIDTH * 1, 0)
        ctx.lineTo(Const.LASER_LANE_WIDTH + Const.SINGLE_LANE_WIDTH * 1, TotalHeight)
        ctx.moveTo(Const.LASER_LANE_WIDTH + Const.SINGLE_LANE_WIDTH * 2, 0)
        ctx.lineTo(Const.LASER_LANE_WIDTH + Const.SINGLE_LANE_WIDTH * 2, TotalHeight)
        ctx.moveTo(Const.LASER_LANE_WIDTH + Const.SINGLE_LANE_WIDTH * 3, 0)
        ctx.lineTo(Const.LASER_LANE_WIDTH + Const.SINGLE_LANE_WIDTH * 3, TotalHeight)
        ctx.stroke()//BTレーン縁
        ctx.strokeStyle = Const.BAR_LINE_COLOR
        ctx.setTransform(1, 0, 0, -1, (TotalWidth - Const.TOTAL_LANE_WIDTH) / 2, TotalHeight - Const.MARGIN_HEIGHT_LOWER);//下側のマージンを省いてY=0を設定
        for (let barLineHeight = 0; barLineHeight < TotalHeight; barLineHeight += Const.BAR_HEIGHT) {//小節線 拍子未実装
            ctx.beginPath()
            ctx.moveTo(0, barLineHeight)
            ctx.lineTo(Const.TOTAL_LANE_WIDTH, barLineHeight)
            ctx.stroke()
        }
    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string[][]} data
     */
    function placeLongs(ctx, data) {//ロングノーツ描画
        data.forEach(d => {//FXを描くループ
            if (d[0].includes("L")) {
                placeLongFX(ctx, "L", Fraction.stringToNumber(d[1]), Fraction.stringToNumber(d[2]))
            }
            if (d[0].includes("R")) {
                placeLongFX(ctx, "R", Fraction.stringToNumber(d[1]), Fraction.stringToNumber(d[2]))
            }
        })
        data.forEach(d => {//BTを描くループ
            if (d[0].includes("A")) {
                placeLongBT(ctx, "A", Fraction.stringToNumber(d[1]), Fraction.stringToNumber(d[2]))
            }
            if (d[0].includes("B")) {
                placeLongBT(ctx, "B", Fraction.stringToNumber(d[1]), Fraction.stringToNumber(d[2]))
            }
            if (d[0].includes("C")) {
                placeLongBT(ctx, "C", Fraction.stringToNumber(d[1]), Fraction.stringToNumber(d[2]))
            }
            if (d[0].includes("D")) {
                placeLongBT(ctx, "D", Fraction.stringToNumber(d[1]), Fraction.stringToNumber(d[2]))
            }
        })
    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string[][][]} data
     */
    function placeVols(ctx, data) {//つまみの描画
        data.forEach(point_data => {//point_data:1つながりのつまみの折れ目ごとの形状データ
            const strokePath = new Path2D()
            const fillPath = new Path2D()
            if (point_data[0][0] != "L" && point_data[0][0] != "R") { console.error("レーザー開始点の情報がありません") }
            /** @type {string[]} */
            let previous
            /** @type {number} */
            let previousVerticalStartLane
            point_data.forEach((d => {
                //始点
                if (d[0] == "L" || d[0] == "R") {
                    const startPos = Fraction.stringToNumber(d[1])
                    const startLane = Number(d[2])
                    //始点の下につくマークの描画位置
                    const markerStartX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane
                    const markerTopX = markerStartX + Const.LASER_WIDTH / 2
                    const markerEndX = markerStartX + Const.LASER_WIDTH
                    const markerTopY = Const.BAR_HEIGHT * startPos
                    const markerStartY = markerTopY - 18
                    //始点の輪郭線の描画位置
                    const startSmallerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane
                    const startLargerX = startSmallerX + Const.LASER_WIDTH
                    const startY = Const.BAR_HEIGHT * startPos
                    if (d[0] == "L") {
                        setTransform(ctx, true, false);//左端を原点にする
                        ctx.fillStyle = Const.VOL_L_COLOR
                        ctx.strokeStyle = Const.VOL_L_BORDER_COLOR
                    } else if (d[0] == "R") {
                        setTransform(ctx, false, true);//右端を原点にする
                        ctx.fillStyle = Const.VOL_R_COLOR
                        ctx.strokeStyle = Const.VOL_R_BORDER_COLOR
                    }
                    ctx.beginPath()
                    ctx.moveTo(markerStartX, markerStartY)
                    ctx.lineTo(markerTopX, markerTopY)
                    ctx.lineTo(markerEndX, markerStartY)
                    ctx.moveTo(markerStartX, markerStartY - 12)
                    ctx.lineTo(markerTopX, markerTopY - 12)
                    ctx.lineTo(markerEndX, markerStartY - 12)
                    ctx.moveTo(markerStartX, markerStartY - 24)
                    ctx.lineTo(markerTopX, markerTopY - 24)
                    ctx.lineTo(markerEndX, markerStartY - 24)
                    ctx.stroke()
                    strokePath.moveTo(startSmallerX, startY)
                    strokePath.lineTo(startLargerX, startY)
                }
                //直角　パスの作成を先送りにし、始点位置の情報だけ追加でキープする
                else if (d[0] == "VERTICAL") {
                    if (previous[0] == "VERTICAL") { console.error("直角同士が隣接しています") }
                    previousVerticalStartLane = Number(previous[2])
                }
                else if (d[0] == "STRAIGHT") {
                    let startPosDelay = 0
                    if (previous[0] == "VERTICAL") {
                        //先送りされていた直角を描画し、直線つまみの始点を32分遅らせる
                        const pos = Fraction.stringToNumber(previous[1])
                        const startLane = previousVerticalStartLane
                        const endLane = Number(previous[2])

                        const startX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane + Const.LASER_WIDTH * Number(startLane > endLane)
                        const startLargerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane + Const.LASER_WIDTH * Number(startLane < endLane)
                        const parallelX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane + Const.LASER_WIDTH * Number(startLane > endLane)
                        const endX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane + Const.LASER_WIDTH * Number(startLane < endLane)
                        const startY = Const.BAR_HEIGHT * pos
                        const endY = startY + Const.BAR_HEIGHT / 32
                        const parallelY = startY + Const.LASER_VERTICAL_HEIGHT

                        const path = new Path2D()
                        path.moveTo(startX, startY)
                        path.lineTo(startX, parallelY)
                        path.lineTo(parallelX, parallelY)
                        path.lineTo(parallelX, endY)
                        path.lineTo(endX, endY)
                        path.lineTo(endX, startY)
                        path.closePath()
                        fillPath.addPath(path)
                        strokePath.moveTo(startX, startY)
                        strokePath.lineTo(startX, parallelY)
                        strokePath.lineTo(parallelX, parallelY)
                        strokePath.lineTo(parallelX, endY)
                        strokePath.moveTo(endX, endY)
                        strokePath.lineTo(endX, startY)
                        strokePath.lineTo(startLargerX, startY)
                        startPosDelay = 1 / 32//始点の遅れ
                    }
                    //通常のレーザーのパスを作る
                    const startPos = Fraction.stringToNumber(previous[1]) + startPosDelay
                    const endPos = Fraction.stringToNumber(d[1])
                    const startLane = Number(previous[2])
                    const endLane = Number(d[2])

                    const startSmallerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane
                    const startLargerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane + Const.LASER_WIDTH
                    const startY = Const.BAR_HEIGHT * startPos
                    const endSmallerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane
                    const endLargerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane + Const.LASER_WIDTH
                    const endY = Const.BAR_HEIGHT * endPos
                    const path = new Path2D()
                    path.moveTo(startSmallerX, startY)
                    path.lineTo(endSmallerX, endY)
                    path.lineTo(endLargerX, endY)
                    path.lineTo(startLargerX, startY)
                    path.closePath()
                    fillPath.addPath(path)
                    strokePath.moveTo(startSmallerX, startY)
                    strokePath.lineTo(endSmallerX, endY)
                    strokePath.moveTo(endLargerX, endY)
                    strokePath.lineTo(startLargerX, startY)
                }
                else if (d[0].includes("CURVE")) {//曲線つまみ
                    if (previous[0] == "VERTICAL") {//始点が直角と同時の場合　不完全
                        //直角のパス用座標
                        const verticalPos = Fraction.stringToNumber(previous[1])
                        const verticalStartLane = previousVerticalStartLane
                        const verticalEndLane = Number(previous[2])

                        const verticalStartX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * verticalStartLane + Const.LASER_WIDTH * Number(verticalStartLane > verticalEndLane)
                        const verticalStartLargerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * verticalStartLane + Const.LASER_WIDTH * Number(verticalStartLane < verticalEndLane)
                        const verticalParallelX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * verticalEndLane + Const.LASER_WIDTH * Number(verticalStartLane > verticalEndLane)
                        const verticalEndX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * verticalEndLane + Const.LASER_WIDTH * Number(verticalStartLane < verticalEndLane)
                        const verticalStartY = Const.BAR_HEIGHT * verticalPos
                        const verticalEndY = verticalStartY + Const.BAR_HEIGHT / 32
                        const verticalParallelY = verticalStartY + Const.LASER_VERTICAL_HEIGHT
                        //曲線のパス用座標
                        const startPos = Fraction.stringToNumber(previous[1])
                        const endPos = Fraction.stringToNumber(d[1])
                        const startLane = Number(previous[2])
                        const endLane = Number(d[2])

                        const startSmallerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane
                        const startLargerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane + Const.LASER_WIDTH
                        const startY = Const.BAR_HEIGHT * startPos
                        const endSmallerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane
                        const endLargerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane + Const.LASER_WIDTH
                        const endY = Const.BAR_HEIGHT * endPos

                        let startCpSmallerX
                        let startCpLargerX
                        let startCpY
                        let endCpSmallerX
                        let endCpLargerX
                        let endCpY
                        if (d[0].includes("INOUT")) {//入りも出も垂直方向の曲線
                            startCpSmallerX = startSmallerX
                            startCpLargerX = startLargerX
                            startCpY = (startY + endY) / 2
                            endCpSmallerX = endSmallerX
                            endCpLargerX = endLargerX
                            endCpY = (startY + endY) / 2
                        } else if (d[0].includes("IN")) {//入りが垂直方向の曲線
                            startCpSmallerX = startSmallerX
                            startCpLargerX = startLargerX
                            startCpY = (startY + endY) / 2
                            endCpSmallerX = endSmallerX
                            endCpLargerX = endLargerX
                            endCpY = endY
                        } else if (d[0].includes("OUT")) {//出が垂直方向の曲線
                            startCpSmallerX = startSmallerX
                            startCpLargerX = startLargerX
                            startCpY = startY
                            endCpSmallerX = endSmallerX
                            endCpLargerX = endLargerX
                            endCpY = (startY + endY) / 2
                        } else {
                            console.error("カーブのタイプ指定が見つかりません")
                        }
                        //直角の描画が曲線からはみ出ないような直角終端X座標
                        //本来はベジェ曲線と直線の交点X座標を入れるべきところをサボっているもの
                        const verticalEndXTemp = d[0].includes("OUT") && ((endLane > startLane && verticalEndLane > verticalStartLane) || (endLane < startLane && verticalEndLane < verticalStartLane)) ? verticalEndX :
                            verticalEndX - Const.LASER_WIDTH * Math.sign(verticalEndLane - verticalStartLane)
                        //直角描画
                        const verticalPath = new Path2D()
                        verticalPath.moveTo(verticalStartX, verticalStartY)
                        verticalPath.lineTo(verticalStartX, verticalParallelY)
                        verticalPath.lineTo(verticalEndXTemp, verticalParallelY)
                        verticalPath.lineTo(verticalEndXTemp, verticalStartY)
                        verticalPath.closePath()
                        fillPath.addPath(verticalPath)
                        strokePath.moveTo(verticalStartX, verticalStartY)
                        strokePath.lineTo(verticalStartX, verticalParallelY)
                        strokePath.lineTo(verticalEndXTemp, verticalParallelY)
                        strokePath.moveTo(verticalEndX, verticalStartY)
                        strokePath.lineTo(verticalStartLargerX, verticalStartY)
                        //曲線描画
                        const path = new Path2D()
                        path.moveTo(startSmallerX, startY)
                        path.bezierCurveTo(startCpSmallerX, startCpY, endCpSmallerX, endCpY, endSmallerX, endY)
                        path.lineTo(endLargerX, endY)
                        path.bezierCurveTo(endCpLargerX, endCpY, startCpLargerX, startCpY, startLargerX, startY)
                        path.closePath()
                        fillPath.addPath(path)
                        strokePath.moveTo(startSmallerX, startY)
                        strokePath.bezierCurveTo(startCpSmallerX, startCpY, endCpSmallerX, endCpY, endSmallerX, endY)
                        strokePath.moveTo(endLargerX, endY)
                        strokePath.bezierCurveTo(endCpLargerX, endCpY, startCpLargerX, startCpY, startLargerX, startY)

                    } else {//ただの曲線
                        const startPos = Fraction.stringToNumber(previous[1])
                        const endPos = Fraction.stringToNumber(d[1])
                        const startLane = Number(previous[2])
                        const endLane = Number(d[2])

                        const startSmallerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane
                        const startLargerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane + Const.LASER_WIDTH
                        const startY = Const.BAR_HEIGHT * startPos
                        const endSmallerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane
                        const endLargerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane + Const.LASER_WIDTH
                        const endY = Const.BAR_HEIGHT * endPos

                        let startCpSmallerX
                        let startCpLargerX
                        let startCpY
                        let endCpSmallerX
                        let endCpLargerX
                        let endCpY
                        if (d[0].includes("INOUT")) {//入りも出も垂直方向の曲線
                            startCpSmallerX = startSmallerX
                            startCpLargerX = startLargerX
                            startCpY = (startY + endY) / 2
                            endCpSmallerX = endSmallerX
                            endCpLargerX = endLargerX
                            endCpY = (startY + endY) / 2
                        } else if (d[0].includes("IN")) {//入りが垂直方向の曲線
                            startCpSmallerX = startSmallerX
                            startCpLargerX = startLargerX
                            startCpY = (startY + endY) / 2
                            endCpSmallerX = endSmallerX
                            endCpLargerX = endLargerX
                            endCpY = endY
                        } else if (d[0].includes("OUT")) {//出が垂直方向の曲線
                            startCpSmallerX = startSmallerX
                            startCpLargerX = startLargerX
                            startCpY = startY
                            endCpSmallerX = endSmallerX
                            endCpLargerX = endLargerX
                            endCpY = (startY + endY) / 2
                        } else {
                            console.error("カーブのタイプ指定が見つかりません")
                        }
                        //曲線の描画
                        const path = new Path2D()
                        path.moveTo(startSmallerX, startY)
                        path.bezierCurveTo(startCpSmallerX, startCpY, endCpSmallerX, endCpY, endSmallerX, endY)
                        path.lineTo(endLargerX, endY)
                        path.bezierCurveTo(endCpLargerX, endCpY, startCpLargerX, startCpY, startLargerX, startY)
                        path.closePath()
                        fillPath.addPath(path)
                        strokePath.moveTo(startSmallerX, startY)
                        strokePath.bezierCurveTo(startCpSmallerX, startCpY, endCpSmallerX, endCpY, endSmallerX, endY)
                        strokePath.moveTo(endLargerX, endY)
                        strokePath.bezierCurveTo(endCpLargerX, endCpY, startCpLargerX, startCpY, startLargerX, startY)

                    }
                } else {
                    console.error(`${d[0]}に対応する形状は実装されていません`)
                }
                previous = d
            }))
            // previousがVERTICALなら終点直角のパスをまるごと加える
            // それ以外ならstrokeで終端を閉じる
            if (previous[0] == "VERTICAL") {
                const pos = Fraction.stringToNumber(previous[1])
                const startLane = previousVerticalStartLane
                const endLane = Number(previous[2])

                const startX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane + Const.LASER_WIDTH * Number(startLane > endLane)
                const startLargerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * startLane + Const.LASER_WIDTH * Number(startLane < endLane)
                const parallelX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane + Const.LASER_WIDTH * Number(startLane > endLane)
                const endX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane + Const.LASER_WIDTH * Number(startLane < endLane)
                const startY = Const.BAR_HEIGHT * pos
                const endY = startY + Const.LASER_END_HEIGHT
                const parallelY = startY + Const.LASER_VERTICAL_HEIGHT
                const path = new Path2D()
                path.moveTo(startX, startY)
                path.lineTo(startX, parallelY)
                path.lineTo(parallelX, parallelY)
                path.lineTo(parallelX, endY)
                path.lineTo(endX, endY)
                path.lineTo(endX, startY)
                path.closePath()
                fillPath.addPath(path)
                strokePath.moveTo(startX, startY)
                strokePath.lineTo(startX, parallelY)
                strokePath.lineTo(parallelX, parallelY)
                strokePath.lineTo(parallelX, endY)
                strokePath.lineTo(endX, endY)
                strokePath.lineTo(endX, startY)
                strokePath.lineTo(startLargerX, startY)
            } else {
                const endPos = Fraction.stringToNumber(previous[1])
                const endLane = Number(previous[2])
                const endSmallerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane
                const endLargerX = (Const.TOTAL_LANE_WIDTH - Const.LASER_LANE_WIDTH) * endLane + Const.LASER_WIDTH
                const endY = Const.BAR_HEIGHT * endPos
                strokePath.moveTo(endSmallerX, endY)
                strokePath.lineTo(endLargerX, endY)
            }
            //パスを実際に描画
            ctx.fill(fillPath)
            ctx.stroke(strokePath)
        })




    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string[][]} data
     */
    function placeChips(ctx, data) {//チップノーツの描画
        const hashOfChipFX = {}//FXチップの上に乗ったBTチップを小さく表示するための連想配列
        data.forEach(d => {
            if (d[0].includes("L") && !d[0].includes("LSE")) {
                placeChipFX(ctx, "L", Fraction.stringToNumber(d[1]), false)
                const posFraction = new Fraction(d[1])
                let keyExists = false
                //タイミングをキーとして、同じタイミングのキーがすでに追加されていればそこに文字を継ぎ足し、ループが終わっても見つからなければ要素を追加する
                Object.keys(hashOfChipFX).forEach(k => {
                    const keyFraction = new Fraction(k)
                    if (Fraction.Equal(keyFraction, posFraction)) {
                        hashOfChipFX[k].concat("L")
                        keyExists = true
                    }
                })
                if (!keyExists) {
                    hashOfChipFX[d[1]] = "L"
                }
            }
            if (d[0].includes("R") && !d[0].includes("RSE")) {
                placeChipFX(ctx, "R", Fraction.stringToNumber(d[1]), false)
                const posFraction = new Fraction(d[1])
                let keyExists = false
                Object.keys(hashOfChipFX).forEach(k => {
                    const keyFraction = new Fraction(k)
                    if (Fraction.Equal(keyFraction, posFraction)) {
                        hashOfChipFX[k].concat("R")
                        keyExists = true
                    }
                })
                if (!keyExists) {
                    hashOfChipFX[d[1]] = "R"
                }
            }
            if (d[0].includes("LSE")) {
                placeChipFX(ctx, "L", Fraction.stringToNumber(d[1]), true)
                const posFraction = new Fraction(d[1])
                let keyExists = false
                Object.keys(hashOfChipFX).forEach(k => {
                    const keyFraction = new Fraction(k)
                    if (Fraction.Equal(keyFraction, posFraction)) {
                        hashOfChipFX[k].concat("L")
                        keyExists = true
                    }
                })
                if (!keyExists) {
                    hashOfChipFX[d[1]] = "L"
                }
            }
            if (d[0].includes("RSE")) {
                placeChipFX(ctx, "R", Fraction.stringToNumber(d[1]), true)
                const posFraction = new Fraction(d[1])
                let keyExists = false
                Object.keys(hashOfChipFX).forEach(k => {
                    const keyFraction = new Fraction(k)
                    if (Fraction.Equal(keyFraction, posFraction)) {
                        hashOfChipFX[k].concat("R")
                        keyExists = true
                    }
                })
                if (!keyExists) {
                    hashOfChipFX[d[1]] = "R"
                }
            }
        })
        data.forEach(d => {
            if (d[0].includes("A")) {
                let fxExists = false
                const posFraction = new Fraction(d[1])
                //タイミングをキーとして、同じタイミングのキーがすでに追加されており、それが重なる位置のFXチップであればBTの幅を小さくする
                Object.keys(hashOfChipFX).forEach(k => {
                    const keyFraction = new Fraction(k)
                    if (Fraction.Equal(keyFraction, posFraction)) {
                        fxExists = hashOfChipFX[k].includes("L")
                    }
                })
                placeChipBT(ctx, "A", Fraction.stringToNumber(d[1]), fxExists)
            }
            if (d[0].includes("B")) {
                let fxExists = false
                const posFraction = new Fraction(d[1])
                Object.keys(hashOfChipFX).forEach(k => {
                    const keyFraction = new Fraction(k)
                    if (Fraction.Equal(keyFraction, posFraction)) {
                        fxExists = hashOfChipFX[k].includes("L")
                    }
                })
                placeChipBT(ctx, "B", Fraction.stringToNumber(d[1]), fxExists)
            }
            if (d[0].includes("C")) {
                let fxExists = false
                const posFraction = new Fraction(d[1])
                Object.keys(hashOfChipFX).forEach(k => {
                    const keyFraction = new Fraction(k)
                    if (Fraction.Equal(keyFraction, posFraction)) {
                        fxExists = hashOfChipFX[k].includes("R")
                    }
                })
                placeChipBT(ctx, "C", Fraction.stringToNumber(d[1]), fxExists)
            }
            if (d[0].includes("D")) {
                let fxExists = false
                const posFraction = new Fraction(d[1])
                Object.keys(hashOfChipFX).forEach(k => {
                    const keyFraction = new Fraction(k)
                    if (Fraction.Equal(keyFraction, posFraction)) {
                        fxExists = hashOfChipFX[k].includes("R")
                    }
                })
                placeChipBT(ctx, "D", Fraction.stringToNumber(d[1]), fxExists)
            }
        })
    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string[][]} data
     */
    function placeBpm(ctx, data) {//BPM表記

        ctx.font = Const.BPM_FONT
        ctx.textAlign = "right"
        ctx.setTransform(1, 0, 0, 1, (TotalWidth - Const.TOTAL_LANE_WIDTH) / 2, TotalHeight - Const.MARGIN_HEIGHT_LOWER)
        let previousBpm
        data.forEach(d => {//[BPM、タイミング]
            ctx.fillStyle = previousBpm ? previousBpm > Number(d[0]) ? Const.BPM_LOWER_COLOR : previousBpm < Number(d[0]) ? Const.BPM_UPPER_COLOR : Const.BPM_NORMAL_COLOR : Const.BPM_NORMAL_COLOR
            previousBpm = Number(d[0])
            ctx.fillText(d[0], 0, -Const.BAR_HEIGHT * Fraction.stringToNumber(d[1]));
        })
    }
    //個々のノーツの描画用関数
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} buttonName
     * @param {number} startPos
     * @param {number} endPos
     */
    function placeLongFX(ctx, buttonName, startPos, endPos) {
        let fillRect1;
        const fillRect2 = Const.BAR_HEIGHT * startPos;
        let fillRect3;
        const fillRect4 = Const.BAR_HEIGHT * (endPos - startPos);
        if (buttonName == "L") {
            fillRect1 = -0
            fillRect3 = -Const.LONG_FX_WIDTH
        } else if (buttonName == "R") {
            fillRect1 = 0
            fillRect3 = Const.LONG_FX_WIDTH
        } else {
            console.log(`FXButtonName "${buttonName}"は存在しません`)
        }
        setTransform(ctx, false, false);//Y軸反転、図中のX軸中央、Y軸下端に原点移動
        ctx.fillStyle = Const.LONG_FX_COLOR
        ctx.fillRect(fillRect1, fillRect2, fillRect3, fillRect4)

    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} buttonName
     * @param {number} startPos
     * @param {number} endPos
     */
    function placeLongBT(ctx, buttonName, startPos, endPos) {
        let fillRect1;
        const fillRect2 = Const.BAR_HEIGHT * startPos;
        let fillRect3;
        const fillRect4 = Const.BAR_HEIGHT * (endPos - startPos);
        if (buttonName == "A") {
            fillRect1 = -Const.SINGLE_LANE_WIDTH - (Const.SINGLE_LANE_WIDTH - Const.LONG_BT_WIDTH) / 2
            fillRect3 = -Const.LONG_BT_WIDTH
        } else if (buttonName == "B") {
            fillRect1 = -(Const.SINGLE_LANE_WIDTH - Const.LONG_BT_WIDTH) / 2
            fillRect3 = -Const.LONG_BT_WIDTH
        } else if (buttonName == "C") {
            fillRect1 = (Const.SINGLE_LANE_WIDTH - Const.LONG_BT_WIDTH) / 2
            fillRect3 = Const.LONG_BT_WIDTH
        } else if (buttonName == "D") {
            fillRect1 = Const.SINGLE_LANE_WIDTH + (Const.SINGLE_LANE_WIDTH - Const.LONG_BT_WIDTH) / 2
            fillRect3 = Const.LONG_BT_WIDTH
        } else {
            console.log(`BTButtonName "${buttonName}"は存在しません`)
        }
        setTransform(ctx, false, false);//Y軸反転、図中のX軸中央、Y軸下端に原点移動
        ctx.fillStyle = Const.LONG_BT_COLOR
        ctx.fillRect(fillRect1, fillRect2, fillRect3, fillRect4)

    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} buttonName
     * @param {number} pos
     * @param {boolean} isSE
     */
    function placeChipFX(ctx, buttonName, pos, isSE) {
        setTransform(ctx, false, false);
        let fillRect1;
        const fillRect2 = Const.BAR_HEIGHT * pos// - Const.CHIP_FX_HEIGHT / 2;//実際の表示に近づくがレーザーやロングとずれる
        let fillRect3;
        const fillRect4 = Const.CHIP_FX_HEIGHT;
        if (buttonName == "L") {
            fillRect1 = -(Const.SINGLE_LANE_WIDTH * 2 - Const.CHIP_FX_WIDTH) / 2
            fillRect3 = -Const.CHIP_FX_WIDTH
        } else if (buttonName == "R") {
            fillRect1 = (Const.SINGLE_LANE_WIDTH * 2 - Const.CHIP_FX_WIDTH) / 2
            fillRect3 = Const.CHIP_FX_WIDTH
        } else {

        }
        if (isSE) {
            ctx.fillStyle = Const.CHIP_FX_SE_COLOR
        } else {
            ctx.fillStyle = Const.CHIP_FX_COLOR
        }
        ctx.fillRect(fillRect1, fillRect2, fillRect3, fillRect4)

    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} buttonName
     * @param {number} pos
     * @param {boolean} onChipFX
     */
    function placeChipBT(ctx, buttonName, pos, onChipFX) {
        setTransform(ctx, false, false);
        let fillRect1;
        const fillRect2 = Const.BAR_HEIGHT * pos// - Const.CHIP_BT_HEIGHT / 2;//実際の表示に近づくがレーザーやロングとずれる
        let fillRect3;
        const fillRect4 = Const.CHIP_BT_HEIGHT;
        ctx.fillStyle = Const.CHIP_BT_COLOR
        if (buttonName == "A") {
            fillRect1 = -Const.SINGLE_LANE_WIDTH - (Const.SINGLE_LANE_WIDTH - (onChipFX ? Const.LONG_BT_WIDTH : Const.CHIP_BT_WIDTH)) / 2
            fillRect3 = onChipFX ? -Const.LONG_BT_WIDTH : -Const.CHIP_BT_WIDTH
        } else if (buttonName == "B") {
            fillRect1 = -(Const.SINGLE_LANE_WIDTH - (onChipFX ? Const.LONG_BT_WIDTH : Const.CHIP_BT_WIDTH)) / 2
            fillRect3 = onChipFX ? -Const.LONG_BT_WIDTH : -Const.CHIP_BT_WIDTH
        } else if (buttonName == "C") {
            fillRect1 = (Const.SINGLE_LANE_WIDTH - (onChipFX ? Const.LONG_BT_WIDTH : Const.CHIP_BT_WIDTH)) / 2
            fillRect3 = onChipFX ? Const.LONG_BT_WIDTH : Const.CHIP_BT_WIDTH

        } else if (buttonName == "D") {
            fillRect1 = Const.SINGLE_LANE_WIDTH + (Const.SINGLE_LANE_WIDTH - (onChipFX ? Const.LONG_BT_WIDTH : Const.CHIP_BT_WIDTH)) / 2
            fillRect3 = onChipFX ? Const.LONG_BT_WIDTH : Const.CHIP_BT_WIDTH
        }
        ctx.fillRect(fillRect1, fillRect2, fillRect3, fillRect4)

    }
}())