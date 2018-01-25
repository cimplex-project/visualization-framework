/**
 * This file contains state variables and functions for controlling the user
 * interface, especially the toolbar at the top of the page.
 */
/**
 * This object contains all variables and functions necessary for UI drawing.
 * It does not handle views, this is done in _viewType.js.
 */
const UI = {
    // toolbar states
    // are buttons aggregated into dropdowns?
    toolbarCompact: false,
    // is toolbar collapsed into one dropdown?
    toolbarCollapsed: false,

    // buttons object (used for updates)
    buttons: {},

    /**
     * Recalculate sizes and adapts views.
     *
     * @param tellViews
     *    Specifies wheter an "onWindowSizeChanged" event should be thrown.
     */
    pageResized(tellViews) {
        if (!isChildWindow()) {
            // get global viewport sizes
            // window width - scrollbar width
            VIEW_CONTAINER_WIDTH = $(window).width() - 10;
            // window height - toolbar height
            VIEW_CONTAINER_HEIGHT = $(window).height() - 135;
            // get toolbar state
            // width where buttons no longer fit the toolbar
            UI.toolbarCompact = VIEW_CONTAINER_WIDTH < 1280;
            // width where bootstrap collapses the navbar
            UI.toolbarCollapsed = VIEW_CONTAINER_WIDTH < 748;
            // draw toolbar
            if (!isChildWindow()) {
                UI.drawToolbarLeft();
                UI.drawToolbarRight();
            }
        } else {
            // get global viewport sizes
            // window width (no scrollbar)
            VIEW_CONTAINER_WIDTH = $(window).width();
            // window height (no toolbar)
            VIEW_CONTAINER_HEIGHT = $(window).height() - 75;
            // remove toolbar and margin
            UI.hideToolbar();
            d3.select("#viewContainer").style("margin-top", "0px");
        }
        // resize views
        if (tellViews) {
            DISPATCH.onWindowSizeChanged();
        }
    },

    /**
     * Draws toolbar buttons.
     */
    drawToolbar() {
        if (!isChildWindow()) {
            UI.drawToolbarLeft();
            UI.drawToolbarRight();
        }
    },

    /**
     * Removes left toolbar to hide buttons that are not currently neeeded.
     */
    hideLeftToolbar() {
        d3.select("#toolbarLeft").style("display", "none");
    },

    /**
     * Shows left toolbar in case it was hidden.
     */
    showLeftToolbar() {
        d3.select("#toolbarLeft").style("display", "block");
    },

    /**
     * Hides the complete toolbar.
     */
    hideToolbar() {
        d3.select("#toolbar").style("display", "none");
    },

    /**
     * Shows toolbar in case it was hidden.
     */
    showToolbar() {
        d3.select("#toolbar").style("display", "block");
    },

    /**
     * Updates button colors without redrawing the whole toolbar.
     */
    updateButtons() {
        if (UI.buttons.filterResetAll) {
            UI.buttons.filterResetAll.style("color", !CRXFILTER.isHistoryAtBottom() ? "var(--accentColor)" : "var(--toolbarButtonColor)");
        }
        if (UI.buttons.filterResetTime) {
            UI.buttons.filterResetTime.style("color", CRXFILTER.isTimeFiltered() ? "var(--accentColor)" : "var(--toolbarButtonColor)");
        }
        if (UI.buttons.filterResetRegions) {
            UI.buttons.filterResetRegions.style("color", CRXFILTER.isRegionsFiltered() ? "var(--accentColor)" : "var(--toolbarButtonColor)");
        }
        if (UI.buttons.filterUndo) {
            UI.buttons.filterUndo.style("color", !CRXFILTER.isHistoryAtBottom() ? "var(--accentColor)" : "var(--toolbarButtonColor)");
        }
        if (UI.buttons.filterRepeat) {
            UI.buttons.filterRepeat.style("color", !CRXFILTER.isHistoryAtTop() ? "var(--accentColor)" : "var(--toolbarButtonColor)");
        }
    },

    /**
     * Draws buttons to (de)activate each view at the top of the page.
     *
     * @param compact
     *    Specifies whether similar buttons should be collapsed into a dropdown.
     */
    drawToolbarLeft() {
        let views;
        if (!CONNECTOR.hiddenViews) {
            views = getRegisteredViews();
        } else {
            // do not draw hidden views
            views = getRegisteredViews().filter(view => CONNECTOR.hiddenViews.indexOf(view.name) === -1);
        }

        const panel = d3.select("#toolbarLeft");
        panel.selectAll("*").remove();
        // check if the toolbar is too small to show all buttons
        const compact = UI.toolbarCompact;
        const collapsed = UI.toolbarCollapsed;

        let viewDropdownList;
        if (compact) {
            // view buttons dropdown
            const viewDropdown = panel.append("li")
                .attr("class", "dropdown");
            viewDropdown.append("a")
                .attr("class", "toolbarButton")
                .attr("class", "dropdown-toggle")
                .attr("data-toggle", "dropdown")
                .attr("role", "button")
                .html(compact ? "<i class=\"fa fa-window-maximize fa-fw\"></i> Views" : "<i class=\"fa fa-window-maximize fa-fw\"></i>")
                .attr("title", "Show or hide specific views")
                .append("span")
                .attr("class", "caret");
            viewDropdownList = viewDropdown.append("ul")
                .attr("class", "dropdown-menu");
        } else {
            viewDropdownList = panel;
        }
        // view buttons
        viewDropdownList.selectAll("li.viewButton")
            .data(views)
            .enter()
            .append("li")
            .append("a")
            .attr("id", d => `${d.name}ViewButton`)
            .attr("class", "toolbarButton viewButton")
            .style("color", d => d.active ? "var(--accentColor)" : "var(--toolbarButtonColor)")
            .html(d => compact ? `${d.icon} ${d.title}` : d.icon)
            .attr("title", d => `Show / hide ${d.title}`)
            .on("click", d => d.active ? DISPATCH.deactivateView([d.name]) : DISPATCH.reactivateView([d.name]));

        let filterDropdownList;
        if (compact) {
            // filter dropdown
            const filterDropdown = panel.append("li")
                .attr("class", "dropdown");
            filterDropdown.append("a")
                .attr("class", "toolbarButton")
                .attr("class", "dropdown-toggle")
                .attr("data-toggle", "dropdown")
                .attr("role", "button")
                .html(compact ? "<i class=\"fa fa-filter fa-fw\"></i> Filter" : "<i class=\"fa fa-filter fa-fw\"></i>")
                .attr("title", "Reset one or all filters")
                .append("span")
                .attr("class", "caret");
            filterDropdownList = filterDropdown.append("ul")
                .attr("class", "dropdown-menu");
        } else {
            filterDropdownList = panel;
            // add separator
            panel.append("li")
                .append("a")
                .attr("class", "toolbarSeparator");
        }

        // filter buttons (reset all)
        UI.buttons.filterResetAll = filterDropdownList.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("title", "Reset all filters")
            .html(compact ? "<i class=\"fa fa-eraser fa-fw\"></i> Reset all filters" : "<i class=\"fa fa-eraser fa-fw\"></i>")
            .on("click", () => {
                if (!CRXFILTER.isHistoryAtBottom()) {
                    CRXFILTER.applyFilter("remove", { time: true, regions: true });
                }
            });

        // filter buttons (reset time)
        UI.buttons.filterResetTime = filterDropdownList.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("title", "Reset time filter")
            .html(compact ? "<i class=\"fa fa-clock-o fa-fw\"></i> Reset time filter" : "<i class=\"fa fa-clock-o fa-fw\"></i>")
            .on("click", () => {
                if (!CRXFILTER.isHistoryAtBottom() && CRXFILTER.isTimeFiltered()) {
                    CRXFILTER.applyFilter("remove", { time: true });
                }
            });

        // filter buttons (reset regions)
        UI.buttons.filterResetRegions = filterDropdownList.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("title", "Reset region filter")
            .html(compact ? "<i class=\"fa fa-dot-circle-o fa-fw\"></i> Reset region filter" : "<i class=\"fa fa-dot-circle-o fa-fw\"></i>")
            .on("click", () => {
                if (!CRXFILTER.isHistoryAtBottom() && CRXFILTER.isRegionsFiltered()) {
                    CRXFILTER.applyFilter("remove", { regions: true });
                }
            });

        // filter buttons (undo)
        UI.buttons.filterUndo = filterDropdownList.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("title", "Undo filter")
            .html(compact ? "<i class=\"fa fa-undo fa-fw\"></i> Undo filter" : "<i class=\"fa fa-undo fa-fw\"></i>")
            .on("click", () => {
                if (!CRXFILTER.isHistoryAtBottom()) {
                    CRXFILTER.applyFilter("undo");
                }
            });

        // filter buttons (repeat)
        UI.buttons.filterRepeat = filterDropdownList.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("title", "Repeat filter")
            .html(compact ? "<i class=\"fa fa-repeat fa-fw\"></i> Repeat filter" : "<i class=\"fa fa-repeat fa-fw\"></i>")
            .on("click", () => {
                if (!CRXFILTER.isHistoryAtTop()) {
                    CRXFILTER.applyFilter("redo");
                }
            });

        if (!compact) {
            // add separator
            panel.append("li")
                .append("a")
                .attr("class", "toolbarSeparator");
        }

        // community detection button
        panel.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("title", "Show detected network communities (impacts performance if enabled)")
            .html(collapsed ? "<i class=\"fa fa-users fa-fw\"></i> Community detection" : "<i class=\"fa fa-users fa-fw\"></i>")
            .style("color", d => {
                return CONFIG.filter.showCommunities ? "var(--accentColor)" : "var(--toolbarButtonColor)";
            })
            .on("click", function () {
                CONFIG.filter.showCommunities = !CONFIG.filter.showCommunities;
                this.style.color = CONFIG.filter.showCommunities ? "var(--accentColor)" : "var(--toolbarButtonColor)";
                // re-detect communities
                CRXFILTER.currentData.updateCommunities();
                // makes views react and redraw
                DISPATCH.onCommunityUpdate();
            });

        // update buttons (e.g. set color to blue if they are currently enabled)
        UI.updateButtons();
    },

    /**
     * Draws buttons for different device layouts, fullscreen and help.
     */
    drawToolbarRight() {
        const panel = d3.select("#toolbarRight");
        panel.selectAll("*").remove();

        // check if toolbar is too small to display all buttons
        const compact = UI.toolbarCompact;
        const collapsed = UI.toolbarCollapsed;

        let deviceDropdownList;
        if (compact) {
            // layout buttons dropdown
            const deviceDropdown = panel.append("li")
                .attr("class", "dropdown");
            deviceDropdown.append("a")
                .attr("class", "toolbarButton")
                .attr("class", "dropdown-toggle")
                .attr("data-toggle", "dropdown")
                .attr("role", "button")
                .html("<i class=\"fa fa-eye fa-fw\"></i> Layout")
                .attr("title", "Change layout or toggle fullscreen")
                .append("span")
                .attr("class", "caret");
            deviceDropdownList = deviceDropdown.append("ul")
                .attr("class", "dropdown-menu");
        } else {
            deviceDropdownList = panel;
        }
        
        // theme button
        deviceDropdownList.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("href", `./?theme=${(CONFIG.UI.darkTheme ? "bright" : "dark")}&config=${CONFIG.id}`)
            .attr("title", CONFIG.UI.darkTheme ? "Bright theme (reloads page)" : "Dark theme (reloads page)")
            .html(() => {
                if (CONFIG.UI.darkTheme) {
                    return compact ? "<i class=\"fa fa-sun-o fa-fw\"></i> Bright theme" : "<i class=\"fa fa-sun-o fa-fw\"></i>";
                } else {
                    return compact ? "<i class=\"fa fa-moon-o fa-fw\"></i> Dark theme" : "<i class=\"fa fa-moon-o fa-fw\"></i>";
                }
            })
            .style("color", CONFIG.id === "mobile" ? "var(--accentColor)" : "var(--toolbarButtonColor)");
        // device buttons
        deviceDropdownList.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("href", `./?theme=${(CONFIG.UI.darkTheme ? "dark" : "bright")}&config=mobile`)
            .attr("title", "View optimized for mobile devices (reloads page)")
            .html(compact ? "<i class=\"fa fa-mobile fa-fw\"></i> Mobile Device" : "<i class=\"fa fa-mobile fa-fw\"></i>")
            .style("color", CONFIG.id === "mobile" ? "var(--accentColor)" : "var(--toolbarButtonColor)");
        deviceDropdownList.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("href", `./?theme=${(CONFIG.UI.darkTheme ? "dark" : "bright")}&config=desktop`)
            .attr("title", "View optimized for laptop and desktop devices (reloads page)")
            .html(compact ? "<i class=\"fa fa-laptop fa-fw\"></i> Laptop / Desktop" : "<i class=\"fa fa-laptop fa-fw\"></i>")
            .style("color", CONFIG.id === "default" ? "var(--accentColor)" : "var(--toolbarButtonColor)");
        deviceDropdownList.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("href", `./?theme=${(CONFIG.UI.darkTheme ? "dark" : "bright")}&config=big`)
            .attr("title", "View optimized for big screen devices (reloads page)")
            .html(compact ? "<i class=\"fa fa-tv fa-fw\"></i> Big Screen Device" : "<i class=\"fa fa-tv fa-fw\"></i>")
            .style("color", CONFIG.id === "big" ? "var(--accentColor)" : "var(--toolbarButtonColor)");
     
        // share button
        if (typeof visframework_Connector !== "undefined") {
            deviceDropdownList.append("li")
                .style("display", typeof broadcaster.getChannel() !== "undefined" ? "none" : "block")
                .append("a")
                .attr("class", "toolbarButton")
                .attr("title", "Share Model")
                .attr("id", "shareVisualizationButton")
                .html(compact ? "<i class=\"fa fa-share-square-o fa-fw\"></i> Share ..." : "<i class=\"fa fa-share-square-o fa-fw\"></i>")
                .style("color", broadcaster.isHosting() ? "var(--accentColor)" : "var(--toolbarButtonColor)")
                .on("click", function () {
                    if(!broadcaster.isHosting()) {
                        broadcaster.createChannel()
                            .then(() => {
                                this.style.color = "var(--accentColor)";
                            })
                            .catch(() => {
                                this.style.color ="var(--toolbarButtonColor)";
                            });
                    } else {
                        broadcaster.removeChannel()
                            .then(() => {
                                this.style.color = "var(--toolbarButtonColor)";
                            })
                            .catch(() => {
                                this.style.color = "var(--accentColor)";
                            });
                    }
                });
        }
        // fullscreen button
        deviceDropdownList.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("title", "Toggle fullscreen")
            .html(compact ? "<i class=\"glyphicon glyphicon-fullscreen fa-fw\"></i> Toggle fullscreen" : "<i class=\"glyphicon glyphicon-fullscreen fa-fw\"></i>")
            .style("color", UI.isFullscreen() ? "var(--accentColor)" : "var(--toolbarButtonColor)")
            .on("click", function () {
                UI.toggleFullscreen();
                this.style.color = !UI.isFullscreen() ? "var(--accentColor)" : "var(--toolbarButtonColor)";
            });

        // help button
        panel.append("li")
            .append("a")
            .attr("class", "toolbarButton")
            .attr("title", "Help & Information")
            .html(collapsed ? "<i class=\"fa fa-question-circle fa-fw\"></i> Help &amp; Information" : "<i class=\"fa fa-question-circle fa-fw\"></i>")
            .style("color", "var(--toolbarButtonColor)")
            .on("click", () => UI.showInfoText());
    },

    /**
     * Hides the visualization page and shows the info page instead.
     */
    showInfoText() {
        d3.select("#viewContainer").style("display", "none");
        d3.select("#infoText").style("display", "block");
    },

    /**
     * Hides the info page and shows the visualization page instead.
     */
    hideInfoText() {
        d3.select("#infoText").style("display", "none");
        d3.select("#viewContainer").style("display", "block");
    },

    /**
     * Displays a bootstrap alert.
     *
     * Types: success, info, warning, danger
     *
     * http://www.w3schools.com/bootstrap/bootstrap_alerts.asp
     */
    showAlert(title, text, type, suppressConsole) {
        const div = d3.select("body").append("div")
            .attr("class", `alert fade in alert-${type}`);
        div.append("a")
            .attr("href", "#")
            .attr("class", "close")
            .attr("data-dismiss", "alert")
            .attr("aria-label", "close")
            .html("&times;");
        div.append("strong").html(title);
        div.append("p").html(text);
        if (!suppressConsole) {
            const message = `alert (${type}): ${title}\n${text}\n`;
            if (type === "danger") {
                console.error(message);
            } else if (type === "warning") {
                console.warn(message);
            } else {
                console.log(message);
            }
        }
    },

    /**
     * Returns true iff page is fullscreen.
     */
    isFullscreen() {
        return !((document.fullScreenElement && document.fullScreenElement !== null)
            || (!document.mozFullScreen && !document.webkitIsFullScreen));
    },

    /**
     * Makes the page fullscreen or restores windowed view.
     */
    toggleFullscreen() {
        if (!UI.isFullscreen()) {
            if (document.documentElement.requestFullScreen) {
                document.documentElement.requestFullScreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullScreen) {
                document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            if (document.cancelFullScreen) {
                document.cancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
        }
    }
};

// subscribed events
DISPATCH.on("onTimeFiltered.ui", UI.updateButtons);
DISPATCH.on("onRegionFiltered.ui", UI.updateButtons);
DISPATCH.on("onFilterReset.ui", UI.updateButtons);
