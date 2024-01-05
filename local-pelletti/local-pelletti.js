const COLORS = {
    mv: 'rgb(0, 128, 255)', // light blue
    ul: 'green',
    sl: 'red',
    ov: 'purple',
    oh: 'saddlebrown',
    pv: '#606060', // grey
    kl: 'black',
    kv: 'lime',
};

// oikeiden nimilyhenteiden määrittely
const NAMES = {
    ov: 'ov',
    mv: 'mv',
    pv: 'vl',
    ul: 'ul',
    sl: 'sl',
    kl: 'kl',
    kv: 'hl',
    oh: 'oh',
}


let globalData;
let globalCoor; // = JSON.parse(localStorage.getItem('COOR'));
let globalRoll = 0;
let globalDataLoadsCount = 0;


window.onload = async function () {
    ladataanTietojaIkkuna();

    await getData()
    setInterval(async () => {
        await getData()
        console.log('globalData:', globalData)
    }, 1000 * 10) // 10s

}; // window.onload = function () {

function formatValue(v, a, keyArvo) {
    if (isNaN(v))
        return '&#8212';
    if (keyArvo === 'oh')
        return v.toFixed(1) + ' %';
    else
        return v.toFixed(1) + ' &#8451';
}


async function getData() {
    const localIp = 'localhost'
    const port = '3333'
    let data = undefined
    try {
        const res = await fetch(`http://${localIp}:${port}`)
        const d = await res.json()
        data = d

    } catch (error) {
        console.log('error:', error)
    }
    if (!data) {
        console.log('ei dataa')
        return
    }
    globalData = globalData || []
    globalData.push(data)
    globalData.sort((a, b) => a.aika - b.aika)
    globalData = handleGapsInData(globalData);
    initializeDOM();
    luoValikko();
    if (globalDataLoadsCount > 0) {
        let d = globalData[globalData.length - 1].aika - globalData[globalData.length - 2].aika
        globalCoor[0] = globalCoor[0] + d
        globalCoor[1] = globalCoor[1] + d
    }
    globalDataLoadsCount++;
    updateGraph();
}

function gotData(data) {
    globalData = Object.values(data.val());
    globalData.sort((a, b) => a.aika - b.aika)
    globalData = handleGapsInData(globalData);
    // console.log('globalData:', globalData)

    initializeDOM();
    luoValikko();
    if (globalDataLoadsCount > 0) {
        let d = globalData[globalData.length - 1].aika - globalData[globalData.length - 2].aika
        globalCoor[0] = globalCoor[0] + d
        globalCoor[1] = globalCoor[1] + d
    }
    globalDataLoadsCount++;
    updateGraph();
}

function errData(error) {
    console.log('error!!!!!!');
    console.log(error);
}


// FUNCTIONS
function clearElement(el) {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

function initializeDOM() {
    const body = document.querySelector('body');
    clearElement(body);

    const legenddiv = document.createElement('div');
    legenddiv.setAttribute('id', 'legenddiv');

    const graphDiv = document.createElement('div');
    graphDiv.innerHTML = `
    <div id='container'>
      <div class='parent'>
        <div class='chart' id='graphdiv'></div>
      </div> 
    <div>`;
    body.appendChild(legenddiv);
    body.appendChild(graphDiv);
}

function ladataanTietojaIkkuna() {
    const body = document.querySelector('body');
    const loadingDiv = document.createElement('div');
    loadingDiv.setAttribute('id', 'loading-div');
    const p = document.createElement('p');
    p.textContent = 'Ladataan tietoja';

    loadingDiv.appendChild(p);
    body.appendChild(loadingDiv);
}

function handleGapsInData(dataArr) {
    let newArr = [];
    for (let i = 0; i < dataArr.length; i++) {
        const x = dataArr[i];
        newArr.push(x);
        if (dataArr[i + 1]) {
            if (dataArr[i + 1].aika - x.aika > 10 * 60 * 1000) {
                const keys = Object.keys(x.data);

                let obj = {
                    aika: (dataArr[i + 1].aika + x.aika) / 2,
                    data: {}
                };
                keys.forEach(function (key) {
                    obj.data[key] = null;
                });
                newArr.push(obj);
            }
        }
    }
    return newArr;
}

function luoValikko() {
    let container = document.getElementById('container');
    let div = document.createElement('div');
    div.setAttribute('id', 'info');
    container.appendChild(div);

    let rangeSelArvo = localStorage.getItem('rangeSel');

    document.getElementById('info').innerHTML = `
    <div id='flexed'>
        <div id='last-pushed-data'>Viimeksi lisätty: <strong>-</strong></div>
    </div>
    <form id='values-form'>
      ${checkboxes()}
      <br>
      <input id='range-nappi' name='range-nappi' type="checkbox" ${rangeSelArvo === 'true' ? 'checked="true"' : ''}>
      <label for='range-nappi'>zoompalkki</label>
    </form> 

    <div id='zooming'>
      <div id='zooming-buttons'>
        <button id="range-kaikki-button">kaikki</button>
      </div>
    </div>


    <div style='margin: auto;'>
        <pre  style='margin: auto;'>
            <table style='margin: auto;'>
                ${Object.entries(NAMES).map(([key, value], i) => {
        const last = globalData[globalData.length - 1];
        return `
                        <tr>
                            <td style="padding: 0 1rem;"><span style="color:${COLORS[key]};font-weight:bold;">${value}</span>:</td>
                            <td style="padding: 0 1rem;">${getTitle(key)}</td>
                            <td style="text-align: right; padding: 0 1rem;">${formatValue(last.data[key], undefined, key)}</td>
                        </tr>
                    `;
    }).join('')
        }
            </table>
        </pre>
    </div>

  `;
    addingListeners();
}


function addingListeners() {

    //checkboxes
    const boxes = document.getElementsByClassName('boxes');
    Array.from(boxes).forEach(function (box) {
        box.addEventListener('change', updateGraph);
    });


    const rangeNappi = document.getElementById('range-nappi');
    rangeNappi.addEventListener('change', updateGraph);


    addEventsZoomButtons(['kaikki',]);
}

// zoomaus vakio arvoihin (viimeiset 24h, viikko, kk, kaikki)
function zoomToConstantValues(start) {
    const startDate = start; //moment().subtract(24, 'hours')._d.getTime();
    const endDate = moment()._d.getTime();
    if (isFinite(startDate) && isFinite(endDate)) {
        globalCoor = [startDate, endDate];
        updateGraph();
    } else {
        console.log('ERROR, vaara paivamaara');
    }
}


function addEventsZoomButtons(keys) {
    keys.map(k => {
        const element = document.getElementById(`range-${k}-button`);
        let end = moment(new Date())._d.getTime();
        let start;
        element.addEventListener('click', function () {

            switch (k) {
                default: //case 'kaikki':
                    start = globalData[0].aika;
                    end = globalData[globalData.length - 1].aika;
                    break;
            }

            // let zoomNappi = document.getElementById('date-range-button');
            const uusiRange = [start, end];
            zoomToConstantValues(start);

        });
    });
}

// paivittaa inputtien arvot

function updateGraph(e) {
    if (e) {
        e.preventDefault();
    }
    let rangeSel;
    let keys = [];
    let boxes = document.getElementsByClassName('boxes');
    let lastDiv = document.querySelector('#last-pushed-data strong')
    lastDiv.textContent = formatTime(globalData[globalData.length - 1].aika)

    Array.from(boxes).forEach(function (box) {
        if (box.checked === true) {
            keys.push(box.value);
        }
    });
    rangeSel = document.getElementById('range-nappi').checked;
    draw(keys, rangeSel);
}

function getTitle(name) {
    const titles = {
        'ov': 'ohjeveden lämpötila',
        'mv': 'menoveden lämpötila',
        'pv': 'varaajan lämpötila',
        'ul': 'ulkolämpötila',
        'sl': 'sisälämpötila',
        'kl': 'kattilan lämpötila',
        'kv': 'hormin lämpötila',
        'oh': 'ohjaus',
    }
    return titles[name]
}

function checkboxes() {
    let checkedKeys = (
        localStorage.getItem('keys') === null
        || localStorage.getItem('keys').length === 0
    )
        ? ['vesi']
        : localStorage.getItem('keys');

    const names = [
        'ov',
        'mv',
        'pv',
        'ul',
        'sl',
        'kl',
        'kv',
        'oh',
    ];
    return names.map((name, i) => {
        return `
      <input id='${name}' class='boxes' type="checkbox" value="${name}" ${checkedKeys.indexOf(name) > -1 ? 'checked' : ''}>
      <label for="${name}" title="${getTitle(name)}"  style="color:${COLORS[name]};font-weight:bold;">${displayName(name)}</label>
    `;
    }).join('');
}

/**
 * käytettään näyttämään oikea nimilyhennys
 * @param {string} name 
 * @returns 
 */
function displayName(name) {
    return NAMES[name]
}

function formatTime(v) {
    return moment(new Date(v)).format('DD.MM.YYYY HH:mm:ss');
}

function draw(keys, rangeSel) {
    let graphdiv = document.getElementById('graphdiv');
    clearElement(graphdiv); //tyhjenna

    localStorage.setItem('keys', keys);
    localStorage.setItem('rangeSel', rangeSel);

    let parsedData = globalData.map(x => {
        let arr = [];
        keys.forEach(key => arr.push(x.data[key]));
        return [new Date(x.aika), ...arr];
    });


    function legendFormatter(dataArr) {
        if (dataArr.x) { // jos on dataa, eli hiiri graphin yläpuolella
            const time = `<div id="legend-aika">
                <span>${moment(new Date(dataArr.x)).format('DD.MM.YYYY HH:mm:ss')}</span>
            </div>`;
            const valuesArray = dataArr.series.map(obj => `<div class='legend-arvot'>
                <span style="color: ${obj.color};">${displayName(obj.label)}</span> 
                <span>${formatValue(obj.y, undefined, obj.label)}</span>
            </div>`);
            return time + valuesArray.map(x => x).join('');
        }
        const lastParsedData = parsedData[parsedData.length - 1];
        const [date, ...values] = lastParsedData;
        const time = `<div id="legend-aika">
            <span class='small'>viimeisin</span>
            <span>${moment(date).format('DD.MM.YYYY HH:mm:ss')}</span>
        </div>`;

        const valuesArray = dataArr.series.map((obj, i) => `<div class='legend-arvot'>
            <span style="color: ${obj.color};" title="${getTitle(obj.label)}">${displayName(obj.label)}</span>
            <span>${formatValue(values[i], undefined, obj.label)}</span>
        </div>`);
        return time + valuesArray.map(x => x).join('');
    }


    function collectColors(keys) {
        return keys.map(k => COLORS[k]);
    }

    let g = new Dygraph(document.getElementById("graphdiv"),
        parsedData,
        {
            labels: ["aika", ...keys],
            // connectSeparatedPoints: false,
            zoomCallback: function (minDate, maxDate, y) {
                globalCoor = [minDate, maxDate];
                updateInputValues(globalCoor);
            },
            rollPeriod: globalRoll, // pyoristaa kulmat
            legend: 'always',
            labelsDiv: 'legenddiv',
            legendFormatter: legendFormatter,
            titleHeight: 32,
            // ylabel: 'Arvot',//'Lämpötila (&#8451)',
            // xlabel: 'Päivämäärä/aika',
            strokeWidth: 1.5,
            showRangeSelector: rangeSel,
            animatedZooms: !rangeSel, // when rangeSelector is on animation need to be off
            colors: collectColors(keys),
            axisLabelFontSize: 18,
            axes: {
                y: { valueFormatter: formatValue },
                x: { valueFormatter: formatTime, }
            },
            // points marker
            drawPoints: true,
            pointSize: 2,
        }
    );


    if (g && globalCoor) {
        g.updateOptions({
            dateWindow: globalCoor
        });
    } else if (g) {
        //initial values

        let start = moment(new Date()).subtract(25, 'hours')._d.getTime();
        let end = moment(new Date())._d.getTime();

        zoomToConstantValues(start);
    }
}
