import { legend } from "./legend.js";

init();

function map3d(year, typeData) {
  require(["./rolling-globe.min.js"], function (rollingGlobe) {
    //getdata
    d3.csv("countries.csv").then(async (data) => {
      typeData = getTypeData(year, typeData); //tide the data by year

      const domain = d3.extent(data, (d) => removeComma(d[year]));
      /* const color = d3.scaleSequentialPow(domain, [
         d3.interpolateViridis(1),
         d3.interpolateViridis(.2), 
         d3.interpolateViridis(0.1)
      ]);  */
      const color = d3
        .scaleSequentialLog(d3.interpolateGnBu)
        .domain([1, 400000]);

      //const color = d3.scaleSequential(d3.interpolateRdYlBu)
      //.domain(Float32Array.from({ length: 1000 }, d3.randomNormal(0.9, 0.1)));

      //]);

      //d3.scaleSequentialQuantile(d3.interpolateRdYlBu)
      // .domain(Float32Array.from({ length: 1000 }, d3.randomNormal(0.5, 0.15)))

      //const color = d3
      // .scaleSequentialPow(domain, d3.interpolateGnBu)//interpolateGnBu
      // .exponent(1 / 2);
      // .exponent(1 / 4);
      d3.select("#globe").selectAll("*").remove();
      var g = new rollingGlobe.Globe("#globe");

      g.features.forEach((d, i) => {
        let value = data.find((v) => v.country === d.properties.name);
        let colorValue = value ? removeComma(value[year]) : 0;
        d.properties.value = colorValue;
        g.values[i] = colorValue;
        g.colors[i] =
          d.properties.name === "United States" ? "green" : color(colorValue);
        g.borderColors =
          d.properties.name === "United States" ? "#153e90" : "#eee";
      });
      // Click to initialize the events

      g.clickCountry = function (i) {
        g.rotateTransitionToICountry(i, function () {
          svg.selectAll(".country");
          g.draw();
        });
      };

      // mouse for hovering

      d3.select(".countryTooltip").style("display", "hidden");
      g.draw();
      //TIP
      const svg = d3.select("#globe svg");
      //tip
      const tip = d3
        .tip()
        .offset([0, 0])
        .attr("class", "d3-tip")
        .html((d) => {
          if (d.target.__data__.properties.name === "United States") {
            return `<li class="red">Year:${year}</li><li class="red">Immediate relatives:${typeData.get(
              "Immediate relatives"
            )}</li>
            <li class="yellow">Family-based:${typeData.get("Family-based")}</li>
            <li class="green">Employment-based:${typeData.get(
              "Employment-based"
            )}</li>
            <li class="brown">Refugees:${typeData.get("Refugees")}</li>
            <li  class="blue">Victims of crimes:${typeData.get(
              "Victims of crimes"
            )}</li>
            `;
          } else {
            return `<li>Year:${year}</li>
        <li>${d.target.__data__.properties.name}</li>
              <li>Immigrant population:${d.target.__data__.properties.value}</li>           
              `;
          }
        });
      svg.call(tip);

      // an attempt to add border to the united states
      svg
        .selectAll(".country")
        .style("stroke", (d) =>
          d.properties.name === "United States" ? "#153e90" : "#eee"
        );
      svg
        .selectAll(".country")
        .on("mouseover", (e, d) => {
          d3.select(e.target).style("fill", "#0e49b5");
          tip.show(e);

          // add border line
          addLine(data, d.properties.admin, undefined, "line", year);
        })
        .on("mouseout", (e, d) => {
          d3.select(e.target).style("fill", (d) =>
            d.properties.name === "United States"
              ? "lightgray"
              : color(d.properties.value)
          );
          tip.hide(d);
        });

      //add legend
      const legendG = d3
        .select("#globe svg")
        .append("g")
        .attr(
          "transform",
          `translate(${window.innerWidth * 0.57},${
            window.innerHeight -200
            //window.innerWidth +5
          }) rotate(270)`
        );
      addLegend(color, legendG);

      window.onresize = function () {
        g.resize();
      };
    });
  });
}
async function mapState(year, typeData) {
  const data = await d3.csv("states.csv");
  const json = await d3.json("us.json");
  typeData = getTypeData(year, typeData); // tide the data by year

  json.features.forEach((d) => {
    let value = data.find((v) => v.state === d.properties.name);

    d.value = value ? removeComma(value[year]) : 0;
  });
  const topStates = json.features
    .map((d) => {
      return {
        state: d.properties.name,
        value: d.value,
      };
    })
    .sort((a, b) => {
      return a.value > b.value ? -1 : 1;
    });

  let top3 = topStates.slice(0, 3);
  const div = d3.select("#state");
  div.selectAll("*").remove();
  const svg = div.append("svg");
  const width = window.innerWidth * 0.5;
  const height = window.innerHeight - 40;
  svg.attr("width", width);
  svg.attr("height", height);

  const project = d3.geoAlbersUsa().fitSize([width * 0.8, height * 0.8], json);
  const path = d3.geoPath().projection(project);
  const domain = d3.extent(json.features, (d) => d.value);
  /* const color = d3.scaleSequential(domain, [
    d3.interpolateBlues(0.5),
    d3.interpolateBlues(0.9),
  ]); */
  const color = d3.scaleSequentialLog(d3.interpolateGnBu).domain([1, 400000]);

  //tip
  const tip = d3
    .tip()
    .offset([0, 0])
    .attr("class", "d3-tip")
    .html(
      (EVENT, d) =>
        `<li>${year}</li><li>${d.properties.name}</li><li>Immigrant population:${d.value}</li>`
    );
  svg.call(tip);
  svg
    .selectAll(".state")
    .data(json.features)
    .join("path")
    .attr("class", (d) => d.properties.name)
    .attr("fill", (d) => color(d.value))
    .attr("stroke", "#303841")
    .attr("d", path)
    .on("mouseover", (e, d) => {
      tip.show(e, d);
      addLine(data, d.properties.name, "state", "linestate", year);
    })
    .on("mouseout", tip.hide);

  const legendG = svg
    .append("g")
    .attr(
      "transform",
      `translate(${window.innerWidth * 0.54 - 200},${
        window.innerHeight - 300
      }) rotate(270)`
    );
  addLegend(color, legendG);

  //add top3 state
  let textDiv = d3.select("#textdiv");
  textDiv.selectAll("*").remove();
  let textSvg = textDiv.append("svg").attr("width", 300).attr("height", 200);
  const top3Title = textSvg
    .append("g")
    .attr("class", "top3")
    .attr("transform", `translate(${20},20)`);
  top3Title
    .append("text")
    .attr("transform", `translate(20,0)`)
    .style("font-size", 20)
    .text("Top 3 States that Settled Most");
  top3Title
    .selectAll("toptext")
    .data(top3)
    .join("text")
    .attr("transform", (d, i) => `translate(20,${(i + 1) * 30})`)
    .text((d) => d.state + ":" + d.value);
}

async function init() {
  const slider = d3
    .select("#customRange1")
    .attr("max", 2019)
    .attr("min", 2001)
    .attr("step", 1);
  //get type data
  let typeData = await d3.csv("type.csv");
  const year = 2001;

  map3d(year, typeData);
  mapState(year, typeData);
  addBar(year, typeData);
  slider.on("change", (e) => {
    d3.select("#yearValue").html(e.target.value);

    map3d(e.target.value, typeData);
    mapState(e.target.value, typeData);
    addBar(e.target.value, typeData);
  });
}

function removeComma(num) {
  return parseInt(num.replace(",", ""));
}

function addLegend(color, legendG) {
  legendG.append(() =>
    legend({
      color,
      width: 270,
      title: "Immigrant",
    })
  );
  legendG
    .append("rect")
    .attr("class", "legend")
    .attr("width", 350)
    .attr("height", 100)
    .attr("x", -40)
    .attr("fill", "none");

  legendG.selectAll("text").attr("transform", "translate(10,20) rotate(90)");
}

function getTypeData(year, typeData) {
  //TYPEDATA
  typeData = d3.rollup(
    typeData,
    (v) => d3.sum(v, (d) => removeComma(d[year])),
    (d) => d.subcate
  );

  return typeData;
}

function addLine(data, country, state, id, year) {
  data =
    state === "state"
      ? data.filter((d) => d.state === country)
      : data.filter((d) => d.country === country);

  data = Object.entries(data[0]);
  data = data
    .map((d) => {
      if (d[0] !== "country" && d[0] !== "state") {
        return {
          key: d[0],
          value: removeComma(d[1]),
        };
      }
    })
    .filter((d) => d);

  const div = d3.select(`#${id}`);
  div.selectAll("*").remove();
  const svg = div.append("svg");

  const width = 500;
  const height = 300;
  svg.attr("width", width);
  svg.attr("height", height);

  const margin = { left: 100, right: 10, top: 30, bottom: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  svg
    .append("text")
    .attr("x", 290)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .text( state === "state"?`number of newcoming immigrants settled in  ${country} during ${year}`:
      ` Number of immigrants from ${country} gained US citizenship in year ${year}`
    )
    .style("font-size", 13);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  //x
  const x = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => new Date(d.key))) //data.map((d) => d.key))
    .range([0, innerWidth]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value)])
    .range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5));

  g.append("g").call(d3.axisLeft(y).ticks(5));

  //y

  const line = d3
    .area()
    .x((d) => x(new Date(d.key)))
    .y0(y(0))
    .y1((d) => y(d.value));

  g.append("path")
    .datum(data)
    .attr("d", line)
    .attr("fill", "#cce5df")
    .attr("stroke", "#69b3a2");
}

//https://observablehq.com/@vasturiano/corona-virus-covid-19-globe

class Mysvg {
  constructor(id, width, height) {
    this.id = id;
    this.width = width;
    this.height = height;
    this.margin = { left: 40, right: 10, top: 30, bottom: 50 };
  }
  init() {
    this.div = d3.select(`#${this.id}`);
    this.div.selectAll("*").remove();
    this.svg = this.div.append("svg");
    this.svg.attr("width", this.width);
    this.svg.attr("height", this.height);

    let margin = this.margin;
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;
    this.innerWidth = this.width - margin.left - margin.right;
    this.innerHeight = this.height - margin.top - margin.bottom;

    this.g = this.svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  }
  title(title) {
    //add the title
    this.svg
      .selectAll(".title")
      .data([1])
      .join("text")
      .attr("class", "title")
      .attr('x',this.width*0.4-title.length)
      .attr("y", 20)
      .text(title)
      .style("font-size", 20)
      .style('text-anchor','left')
      ;
  }
  xAxis(xScale) {
    this.g
      .selectAll(".xAxis")
      .data([1])
      .join("g")
      .attr("transform", `translate(0,${this.innerHeight})`)
      .attr("class", "xAxis")
      .call(d3.axisBottom(xScale));
  }
  yAxis(yScale) {
    this.g
      .selectAll("yAxis")
      .data([1])
      .join("g")
      .attr("transform", `translate(0,${0})`)
      .attr("class", "yAxis")
      .call(d3.axisLeft(yScale));
  }
  tip(tipHtml, className) {
    const tip = d3.tip().offset([0, 0]).attr("class", "d3-tip").html(tipHtml);
    this.svg.call(tip);
    this.g
      .selectAll(`.${className}`)
      .on("mouseover", tip.show)
      .on("mouseout", tip.hide);
  }
}

function addBar(year, data) {
  let typeData = getTypeData(year, data);
  data = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => removeComma(d[year])),
    (d) => d.subcate + ":" + d.type
  );
  data.sort((a, b) => (a[1] > b[1] ? -1 : 1));

  // barplot at page 3
  const svg = new Mysvg("bar", window.innerWidth * 0.6, window.innerHeight);
  svg.margin.left = 500;
  svg.margin.bottom = window.innerHeight * 0.2;
  svg.init();
  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d[0]))
    .range([0, svg.innerHeight])
    .padding(0.3);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d[1])])
    .range([0, svg.innerWidth]);

  svg.xAxis(yScale);
  svg.yAxis(xScale);
  svg.title(` Number of Immediate Categories  in the Year of ${year}`);

  //drawBar
  let g = svg.g;
  g.selectAll("myrect")
    .data(data)
    .join("rect")
    .attr("class", "myrect")
    .attr("x", 0)
    .attr("y", (d) => xScale(d[0]))
    .attr("width", (d) => yScale(d[1]))
    .attr("height", xScale.bandwidth())
    .attr("fill", "gray");
  ///tip

  const html = (EVENT, d) =>
    `<li>${year}</li><li>${d[0]}</li
    ><li>Immigrant population:${d[1]}</li>`;
  svg.tip(html, "myrect");

  //Text

  const CateText = `<li class="red">Year:${year}</li><li class="red">Immediate relatives:${typeData.get(
    "Immediate relatives"
  )}</li>
  <li class="yellow">Family-based:${typeData.get("Family-based")}</li>
  <li class="green">Employment-based:${typeData.get("Employment-based")}</li>
  <li class="brown">Refugees:${typeData.get("Refugees")}</li>
  <li  class="blue">Victims of crimes:${typeData.get("Victims of crimes")}</li>
  `;

  d3.select("#textCate").selectAll("ul").data([1]).join("ul").html(CateText);
  //position: relative;
  // svg.div
  //   .style("position", "relative")
  //   .append("ul")
  //   .style("position", "absolute")
  //   .style("bottom", `20vh`)
  //   .style("right", `10vw`)
  //   .html(CateText);
}
