import { legend } from "./legend.js";

init();

function map3d(year, typeData) {
  require(["./rolling-globe.min.js"], function (rollingGlobe) {
    //getdata
    d3.csv("countries.csv").then(async (data) => {
      typeData = getTypeData(year, typeData); // tidy the data by year
      console.log(typeData);
      const domain = d3.extent(data, (d) => removeComma(d[year]));
      const color = d3
        .scaleSequentialPow(domain, d3.interpolateGnBu)
        .exponent(1 / 4);
      d3.select("#globe").selectAll("*").remove();
      var g = new rollingGlobe.Globe("#globe");
      // import yearly immigrant stats
      g.features.forEach((d, i) => {
        let value = data.find((v) => v.country === d.properties.name);
        let colorValue = value ? removeComma(value[year]) : 0;
        d.properties.value = colorValue;
        g.values[i] = colorValue;
        g.colors[i] =
          d.properties.name === "United States"
            ? "lightgray"
            : color(colorValue);
        g.borderColors =
          d.properties.name === "United States" ? "#153e90" : "#eee";
      });
      
      // click to view content

      g.clickCountry = function (i) {
        g.rotateTransitionToICountry(i, function () {
          svg.selectAll(".country");
          g.draw();
        });
      };

      // box for hover the mouse

      //test 
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
            return `<li class="red">Year:${year}</li><li class="blue">Immediate relatives:${typeData.get(
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

      // US
      svg
        .selectAll(".country")
        .style("stroke", (d) =>
          d.properties.name === "United States" ? "#153e90" : "#eee"
        );
      svg
        .selectAll(".country")
        .on("mouseover", (e, d) => {
          d3.select(e.target).style("fill", "green");
          tip.show(e);
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
        .attr("transform", `translate(20,${window.innerHeight-200}) rotate(270)`);
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
  typeData = getTypeData(year, typeData); //根据年份整理typedata

  json.features.forEach((d) => {
    let value = data.find((v) => v.state === d.properties.name);

    d.value = value ? removeComma(value[year]) : 0;
  });
  console.log(data, json);
  const div = d3.select("#state");
  div.selectAll("*").remove();
  const svg = div.append("svg");
  const width = window.innerWidth*0.6;
  const height =window.innerHeight-40;
  svg.attr("width", width);
  svg.attr("height", height);

  const project = d3.geoAlbersUsa().fitSize([width, height], json);
  const path = d3.geoPath().projection(project);
  const domain = d3.extent(json.features, (d) => d.value);
  const color = d3
    .scaleSequentialPow(domain, d3.interpolateGnBu)
    .exponent(1 / 4)
    .domain(domain);
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
    .on("mouseover", tip.show)
    .on("mouseout", tip.hide);

  const legendG = svg
    .append("g")
    .attr("transform", `translate(0,${window.innerHeight-300}) rotate(270)`);
  addLegend(color, legendG);
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

  slider.on("change", (e) => {
    d3.select("#yearValue").html(e.target.value);

    map3d(e.target.value, typeData);
    mapState(e.target.value, typeData);
  });
}

function removeComma(num) {
  return parseInt(num.replace(",", ""));
}

function addLegend(color, legendG) {
  legendG.append(() =>
    legend({
      color,
      width: 200,
      title: "Immigrant",
    })
  );
  legendG.append('rect').attr('class','legend').attr('width',300).attr('height',100).attr('x',-70).attr('fill','none')

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

//https://observablehq.com/@vasturiano/corona-virus-covid-19-globe
