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
let globalTimeUntillNextDiv;
let globalTimeIntervalId;


window.onload = function () {
    // Initialize Firebase
    const config = {
        apiKey: "AIzaSyDlJ3CQuKTfTGKX1uFgt3rdPGRCi4N-0lo",
        authDomain: "palomaki-pelletti.firebaseapp.com",
        databaseURL: "https://palomaki-pelletti.firebaseio.com",
        projectId: "palomaki-pelletti",
        storageBucket: "palomaki-pelletti.appspot.com",
        messagingSenderId: "418669381390"
    };

    firebase.initializeApp(config);

    let database = firebase.database();
    let ref = database.ref('lampo');
    ref.orderByKey().on('value', gotData, errData);
    ladataanTietojaIkkuna();
}; // window.onload = function () {

/**
 * runs when data is loaded from firebase
 * @param {*} data 
 */
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
        <div id='time-now'>Aikaa seuravaan lisäykseen noin: <strong>-</strong></div>
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
        <button id="range-24h-button">24h</button>
        <button id="range-viikko-button">viikko</button>
        <button id="range-kk-button">kk</button>
        <button id="range-kaikki-button">kaikki</button>
      </div>
      <div id='zooming-inputs'>
        <input type="text" id='start-date' placeholder="dd-mm-yyyy">
        <input type="text" id='end-date' placeholder="dd-mm-yyyy">
        <button id="date-range-button">Zoomaa</button>
      </div>
    </div>

    <div style='margin: auto;'>
        <pre  style='margin: auto;'>
            <table style='margin: auto;'>
                ${
                    Object.entries(NAMES).map(([key, value], i) => {
                        // <div><span style="color:${COLORS[key]};font-weight:bold;">${value}</span>: ${getTitle(key)}</div>
                        return `
                            <tr>
                                <td><span style="color:${COLORS[key]};font-weight:bold;">${value}</span>:</td>
                                <td>${getTitle(key)}</td>
                            </tr>
                        `;
                    }).join('')
                }
            </table>
        </pre>
    </div>

    <ul>
      <li>Pan: shift + leftClick (zoompalkki pois päältä).</li> 
      <li>Näytä kaikki: kaksois leftClick (zoompalkki pois päältä).</li> 
    </ul>
    <input type="range" id="roll" min="0" max="15" value="0">
  `;
    globalTimeUntillNextDiv = document.querySelector('#time-now strong')
    updateTimeInterval()
    addingListeners();
}

function updateTimeInterval() {
    if (globalTimeIntervalId) {
        clearInterval(globalTimeIntervalId)
    }
    globalTimeIntervalId = setInterval(() => {
        globalTimeUntillNextDiv.textContent = getTimeUntillNext()
    }, 1000)
    globalTimeUntillNextDiv.textContent = getTimeUntillNext()
}

function getTimeUntillNext() {
    let end = moment(globalData[globalData.length - 1].aika).add(5, 'minutes')
    let start = moment()
    let duration = moment.duration(end.diff(start))
    let f = moment.utc(duration.as('milliseconds')).format("HH:mm:ss");
    return f
}

function addingListeners() {
    const slider = document.getElementById('roll');
    slider.oninput = function () {
        globalRoll = this.value;
        updateGraph();
    };

    //checkboxes
    const boxes = document.getElementsByClassName('boxes');
    Array.from(boxes).forEach(function (box) {
        box.addEventListener('change', updateGraph);
    });


    const rangeNappi = document.getElementById('range-nappi');
    rangeNappi.addEventListener('change', updateGraph);

    const dateRangeButton = document.getElementById('date-range-button');
    dateRangeButton.addEventListener('click', zoomButtonClicked);

    const inputStartDate = document.getElementById('start-date');
    inputStartDate.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
            zoomButtonClicked();
        }
    });
    const inputEndDate = document.getElementById('end-date');
    inputEndDate.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
            zoomButtonClicked();
        }
    });
    addEventsZoomButtons(['24h', 'viikko', 'kk', 'kaikki',]);
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

function zoomButtonClicked() {
    const startDateInput = document.getElementById('start-date');
    const startDate = moment(startDateInput.value, 'DD-MM-YYYY')._d.getTime();
    const endDateInput = document.getElementById('end-date');
    const endDate = moment(endDateInput.value, 'DD-MM-YYYY')._d.getTime();
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
                case '24h':
                    start = moment(new Date()).subtract(25, 'hours')._d.getTime();
                    break;
                case 'viikko':
                    start = moment(new Date()).subtract(8, 'days')._d.getTime();
                    break;
                case 'kk':
                    start = moment(new Date()).subtract(1, 'months')._d.getTime();
                    break;
                default: //case 'kaikki':
                    start = globalData[0].aika;
                    end = globalData[globalData.length - 1].aika;
                    break;
            }

            // let zoomNappi = document.getElementById('date-range-button');
            const uusiRange = [start, end];
            updateInputValues(uusiRange);
            zoomToConstantValues(start);

        });
    });
}

// paivittaa inputtien arvot
function updateInputValues(coor) {
    const minDate = coor[0];
    const maxDate = coor[1];

    let sd = moment(new Date(minDate)).format('DD-MM-YYYY');
    document.getElementById('start-date').value = sd;
    let ed = moment(new Date(maxDate)).format('DD-MM-YYYY');
    document.getElementById('end-date').value = ed;
}

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

    function formatValue(v, a, keyArvo) {
        if (isNaN(v))
            return '&#8212';
        if (keyArvo === 'oh')
            return v.toFixed(1) + ' %';
        else
            return v.toFixed(1) + ' &#8451';
    }


    function legendFormatter(dataArr) {
        if (dataArr.x) { // jos on dataa, eli hiiri graphin yläpuolella
            const time = `<div id="legend-aika">
                <span>${moment(new Date(dataArr.x)).format('DD.MM.YYYY HH:mm')}</span>
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
            <span>${moment(date).format('DD.MM.YYYY HH:mm')}</span>
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
            }
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
        updateInputValues([start, end]);
    }
}
