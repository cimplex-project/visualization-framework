/**
 * This view shows statistics for total and filtered data.
 */
class FilterInfo extends View {
    constructor(params) {
        super(params);

        // subscribed events
        DISPATCH.on(`initializeView.${this.name}`, param => {
            if (param.includes(this.name)) {
                // config dependent attributes can only be set here
                this.activate();
                this.setStyleSelectors(lib.getSelectorsForColumnType(CONFIG.UI.viewColumns), false);
                this.setHeight(Math.floor(VIEW_CONTAINER_HEIGHT / CONFIG.UI.viewRows), false);
            }
        });
        DISPATCH.on(`onRegionFiltered.${this.name}`, () => this.draw());
        DISPATCH.on(`onTimeFiltered.${this.name}`, () => this.draw());
        DISPATCH.on(`onFilterReset.${this.name}`, () => this.draw());
        DISPATCH.on(`onCommunityUpdate.${this.name}`, () => this.draw());

        // Load template
        $.get("./views/filterInfo/filterInfo_template.html").promise().then((template) => {
            this.template = template;
        });

        this.setDrawFunction(this.drawFilterInfo);
    }

    /**
     * show filter information
     */
    drawFilterInfo() {
        // get data
        const data = CRXFILTER.currentData;
        const baseData = CRXFILTER.baseData;

        // if data is not ready yet, do nothing
        if (!data.finished || baseData.timeRange[0] < 0) {
            return;
        }

        // get information about the data
        const timeFiltered = CRXFILTER.isTimeFiltered();
        const iterations = data.states !== undefined && data.states !== null;

        // function for time formatting
        const timeFormat = d3.time.format("%Y-%m-%d %H:%M");

        // use width of view to determine SVG withs
        let doubleColumns;
        let svgWidth;
        if (this.width > 580 || this.widthDoubled) {
            doubleColumns = true;
            svgWidth = Math.floor((this.width - 70) / 2);
        } else {
            doubleColumns = false;
            svgWidth = Math.floor(this.width - 30);
        }
        const svgHeightDistr = 60;
        const labelWidth = 65;
        const chartWidth = svgWidth - labelWidth;

        // ratio of filtered to total items
        const nodeRatio = data.regions.length / data.model.regions.length;
        const linkRatio = data.transitionCount.all / data.model.transitions.length;
        const timeRatio = this.timeRatio(data, baseData, timeFiltered, iterations);

        // other data to display (no transtitions means also no communities)
        let showCommunities;
        let showTransitions;
        let transitionDistrRegion;
        let transitionDistrWeight;
        let communityRegionStats;
        let communityTransitionStats;
        if (data.transitionCount.all > 0) {
            showTransitions = true;
            showCommunities = CONFIG.filter.showCommunities && data.finished && CONFIG.filterInfo.showSections.communities;

            if (CONFIG.filterInfo.showSections.network) {
                transitionDistrRegion = this.transitionDistrRegion(
                    data,
                    chartWidth,
                    svgHeightDistr - 14,
                    labelWidth
                );
                transitionDistrWeight = this.transitionDistrWeight(
                    data,
                    chartWidth,
                    svgHeightDistr - 14,
                    labelWidth
                );
            }

            if (showCommunities) {
                communityRegionStats = this.communityDistrRegions(
                    data,
                    chartWidth,
                    svgHeightDistr - 14,
                    labelWidth
                );
                communityTransitionStats = this.communityDistrTransitions(
                    data,
                    chartWidth,
                    svgHeightDistr - 14,
                    labelWidth
                );
            }
        } else {
            showTransitions = false;
            showCommunities = false;
        }

        // create data for Mustache template
        const templateData = {
            // shared attributes
            svgWidth: svgWidth,
            svgHeightDistr: svgHeightDistr,
            labelWidth: labelWidth,
            chartWidth: chartWidth,
            barTextPos: labelWidth + chartWidth / 2,
            minPos: labelWidth + 0,
            min: 0,
            maxPos: labelWidth + chartWidth,
            valuePos: labelWidth + chartWidth / 2,
            meanPos: labelWidth + chartWidth / 2,
            "transitionsShown?": showTransitions,
            "communitiesShown?": showCommunities,
            "communityDetection?": CONFIG.filter.showCommunities
        };

        // individual attributes
        if (CONFIG.filterInfo.showSections.network) {
            templateData.network = [
                {
                    label: "# nodes",
                    barWidth: nodeRatio * chartWidth,
                    barText: `${data.regions.length} | ${(nodeRatio * 100).toFixed(2)} %`,
                    max: data.model.regions.length
                }
            ];
            if (showTransitions) {
                templateData.network.push({
                    label: "# links",
                    barWidth: linkRatio * chartWidth,
                    barText: `${data.transitionCount.all} (${data.transitionCount.reduced}) | ${(linkRatio * 100).toFixed(2)} %`,
                    max: data.model.transitions.length
                });

                templateData.network2 = [
                    {
                        label1: "links",
                        label2: "per node",
                        min: `min: ${transitionDistrRegion.min}`,
                        mean: `mean: ${transitionDistrRegion.mean.toFixed(1)}`,
                        max: `max: ${transitionDistrRegion.max}`,
                        bars: transitionDistrRegion.bars
                    },
                    {
                        label1: "links",
                        label2: "per weight",
                        min: `min: ${transitionDistrWeight.min}`,
                        mean: `mean: ${transitionDistrWeight.mean.toFixed(1)}`,
                        max: `max: ${transitionDistrWeight.max}`,
                        bars: transitionDistrWeight.bars
                    }
                ];
            }
        }
        if (CONFIG.filterInfo.showSections.time) {
            templateData.time = {
                barWidth: timeRatio * chartWidth,
                barText: this.timeInfo(data, baseData, iterations, timeFormat),
                min: timeFormat(new Date(data.timeRange[0])),
                max: timeFormat(new Date(data.timeRange[1])),
                minTotal: timeFormat(new Date(baseData.timeRange[0])),
                maxTotal: timeFormat(new Date(baseData.timeRange[1]))
            };
        }
        if (showCommunities) {
            templateData.communityText = [
                {
                    label: "number of communities",
                    text: data.communityCount
                }
            ];
            templateData.communityDistr = [
                {
                    label1: "nodes per",
                    label2: "community",
                    min: `min: ${communityRegionStats.min}`,
                    mean: `mean: ${communityRegionStats.mean.toFixed(1)}`,
                    max: `max: ${communityRegionStats.max}`,
                    bars: communityRegionStats.bars
                },
                {
                    label1: "links per",
                    label2: "community",
                    min: `min: ${communityTransitionStats.min}`,
                    mean: `mean: ${communityTransitionStats.mean.toFixed(1)}`,
                    max: `max: ${communityTransitionStats.max}`,
                    bars: communityTransitionStats.bars
                }
            ];
        };

        // show filter history
        if (CONFIG.filterInfo.showSections.filterHistory) {
            templateData.filterHistory = [];
            templateData.filterHistory.push({
                label: "id action",
                text: "range"
            });
            CRXFILTER.history.stack.forEach((item, index) => {
                let label, text;
                if (index == 0) {
                    label = "initial";
                    text = "all data";
                } else {
                    switch (item.type) {
                        case "regions":
                            label = `${index} nodes`;
                            text = `${item.regions.length} nodes`;
                            break;
                        case "time":
                            label = `${index} time`;
                            text = this.timeInfo(item, baseData, iterations, timeFormat);
                            break;
                        case "geoRange":
                            label = `${index} geo range`;
                            const b = item.geographicBounds;
                            text = `${b[0, 0].toFixed(1)}, ${b[0, 1].toFixed(1)}, ${b[1, 0].toFixed(1)}, ${b[1, 1].toFixed(1)}`;
                            break;
                        case "remove":
                            label = `${index} remove`;
                            text = "";
                            break;
                        default:
                            label = "error";
                    }
                }
                // indicate current filter state
                if (index != 0 && index === CRXFILTER.history.index) {
                    label += " (current)";
                }
                templateData.filterHistory.push({
                    label: label,
                    text: text
                });
            });
        }

        // show data service parameters
        if (CONFIG.filterInfo.showSections.dataServiceParameters) {
            const p = data.model.dataServiceParameters;
            templateData.dataServiceParameters = [];
            Object.keys(p).forEach(function (key) {
                templateData.dataServiceParameters.push({
                    label: key,
                    text: p[key]
                });
            });
        }

        // render Mustache template with data
        this.viewDiv.html(Mustache.to_html(this.template, templateData));

        // adapt div style for single or double column layout
        if (doubleColumns) {
            this.viewDiv.selectAll(".section").attr("class", "section col-xs-6 col-sm-6 col-md-6 col-lg-6");
        } else {
            this.viewDiv.selectAll(".section").attr("class", "section col-xs-12 col-sm-12 col-md-12 col-lg-12");
        }
    }

    /**
     * Toggles the visibility of a section (collapsed / shown).
     */
    toggle(section) {
        CONFIG.filterInfo.showSections[section] = !CONFIG.filterInfo.showSections[section];
        this.draw();
    }

    /**
     * Amount of filtered time in percent, iteration, days, ... as string.
     */
    timeInfo(data, baseData, iterations, timeFormat) {
        const ratio = this.timeRatio(data, baseData, true, iterations);
        const t1 = data.timeRange[0];
        const t2 = data.timeRange[1];
        if (iterations) {
            const iteration1 = Math.ceil((t1 - baseData.timeRange[0]) / lib.toMillis.day);
            const iteration2 = Math.ceil((t2 - baseData.timeRange[0]) / lib.toMillis.day) - 1;
            if (data.iterationCount == 1) { return `${data.iterationCount} iteration ${iteration1}`; }
            else { return `${data.iterationCount} iteration ${iteration1} - ${iteration2}`; }
        } else {
            const minutes = ~~((t2 - t1) / (1000 * 60));
            const hours = ~~(minutes / 60);
            const days = ~~(hours / 24);
            return `${days}d ${hours % 24}h ${minutes % 60}m | ${(ratio * 100).toFixed(2)}%`;
        }
    }

    /**
     * ratio of filtered to total time
     */
    timeRatio(data, baseData, timeFiltered, iterations) {
        if (timeFiltered) {
            if (iterations) {
                return (data.iterationCount / CRXFILTER.currentData.model.states.length * 100).toFixed(2);
            } else {
                return (data.timeRange[1] - data.timeRange[0]) / (baseData.timeRange[1] - baseData.timeRange[0]);
            }
        } else {
            return 1.0;
        }
    }

    /**
     * statistics and barchart coordinates for communities and regions
     */
    communityDistrRegions(data, width, height, xOffset) {
        // regions per community
        const regionsPerCommunity = Array(data.communityCount).fill(0);
        for (let i = 0; i < data.regions.length; i++) {
            regionsPerCommunity[data.regions[i].community]++;
        }

        const labelFunc = (i, d) => {
            return `community ${i}:\n${d} nodes`;
        };

        return this.distrBarChart(regionsPerCommunity, width, height, xOffset, labelFunc);
    }

    /**
     * statistics and barchart coordinates for communities and transitions
     */
    communityDistrTransitions(data, width, height, xOffset) {
        // transitions per community
        const transitionsPerCommunity = Array(data.communityCount).fill(0);
        data.transitions.forEach(t => {
            const r1 = t.source;
            const r2 = t.target;
            // only count transitions within one community
            // exept when there is only one region filtered
            if (data.regions.length == 1) {
                const r = r1 ? r1 : r2;
                transitionsPerCommunity[r.community]++;
            } else if (r1.community == r2.community) {
                transitionsPerCommunity[r1.community]++;
                transitionsPerCommunity[r2.community]++;
            }
        });

        const labelFunc = (i, d) => {
            return `community ${i}:\n${d} links`;
        };

        return this.distrBarChart(transitionsPerCommunity, width, height, xOffset, labelFunc);
    }

    /**
     * statistics and barchart coordinates for transitions and regions
     */
    transitionDistrRegion(data, width, height, xOffset) {
        // transtions per region
        const transitionsPerRegion = data.regions.map(r => {
            return r.properties.transitionNumber;
        });

        const labelFunc = (i, d) => {
            return `${data.regions[i].properties.name}:\n${d} single transitions`;
        };

        return this.distrBarChart(transitionsPerRegion, width, height, xOffset, labelFunc);
    }

    /**
     * statistics and barchart coordinates for transitions and their weights
     */
    transitionDistrWeight(data, width, height, xOffset) {
        // # transitions per weight bin
        const binNumber = 50;
        const maxWeight = data.transitionWeights.max;
        const binSize = maxWeight / (binNumber - 1);
        const transitionsPerWeight = Array(binNumber).fill(0);

        data.reducedTransitions.forEach(d => {
            transitionsPerWeight[Math.floor(+d.weight / binSize)]++;
        });

        const labelFunc = (i, d, p) => {
            const lower = (i * p).toFixed(2);
            const upper = ((i + 1) * p).toFixed(2);
            return `weight range [${lower}, ${upper}):\n${d} reduced transitions`;
        };

        return this.distrBarChart(transitionsPerWeight, width, height, xOffset, labelFunc, binSize);
    }

    /**
     * Statistics and bar chart coordinates for distributions.
     *
     * @param prepData
     *    perparedData: Array of values to visualize and calculate statistics with.
     *
     * @param width, height
     *    size of the bar chart
     *
     * @param xOffset
     *    x-coordinate of the bar chart position
     *
     * @param labelFunc
     *    function for the label text, gets passed the bar index, data value and <param>
     *
     * @param param
     *    param that is passed as third parameter to labelFunc
     */
    distrBarChart(prepData, width, height, xOffset, labelFunc, param) {
        prepData = prepData.filter(x => !isNaN(x));

        // stats
        const min = d3.min(prepData);
        const max = d3.max(prepData);
        const mean = d3.mean(prepData);

        // Distr bar chart
        const barWidth = width / prepData.length;
        const scale = d3.scale.linear()
            .domain([0, max])
            .range([0, height]);

        const bars = [];
        let x = xOffset,
            y;
        const gap = Math.min(0.1 * barWidth, 2);
        for (let i = 0; i < prepData.length; i++) {
            y = height - scale(prepData[i]);
            bars.push({
                x: x,
                y: y,
                width: barWidth - gap,
                height: height - y,
                title: labelFunc(i, prepData[i], param)
            });
            x += barWidth;
        }

        return {
            min: min,
            max: max,
            mean: mean,
            bars: bars
        };
    }
}


const filterInfoView = new FilterInfo({
    name: "filterInfo",
    title: "Data and Filter Statistics",
    icon: "<i class=\"fa fa-bar-chart fa-fw\"></i>",
    hasSettings: false,
    infoText: `<p>This view shows statistics for the total and filtered data.</p>
                   <p>The Network section shows information about the number of nodes and links, once for the current filter and once for the total data set. It also shows some graph theoretical metrics.</p>
                   <p>Information about the currently selected and the total time span are displayed in the Time section.</p>
                   <p>The Community section displays the number of detected communities alongside a histogram of how many nodes and links there are inside each community (links between two communities are not included).</p>`
});
