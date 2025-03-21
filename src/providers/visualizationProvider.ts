import * as vscode from "vscode"
import { CSVDataProvider } from "./csvDataProvider"

// Define interfaces for data types


// interface ChartData {
//   x: string | number
//   y: number
//   color?: string
// }
//



interface BarChartData {
  category: string
  value: number
}

// interface HeatmapData {
//   row: string
//   col: string
//   value: number
// }



export class VisualizationProvider {
  private _csvDataProvider: CSVDataProvider
  private readonly _extensionUri: vscode.Uri

  constructor(extensionUri: vscode.Uri) {
    this._csvDataProvider = new CSVDataProvider()
    this._extensionUri = extensionUri
  }

  async showVisualizationOptions(uri: vscode.Uri) {
    try {
      const data = await this._csvDataProvider.parseCSVFile(uri)
      const columns = this._csvDataProvider.getColumnNames(data)

      // Filter columns that might contain numeric data
      const numericColumns = this.getNumericColumns(data, columns)

      if (numericColumns.length < 2) {
        vscode.window.showInformationMessage("Not enough numeric columns found for visualization.")
        return
      }

      const visualizationType = await vscode.window.showQuickPick(["Scatter Plot", "Bar Chart", "Line Chart"], {
        placeHolder: "Select visualization type",
      })

      if (!visualizationType) {
        return
      }

      let xAxis: string | undefined, yAxis: string | undefined, colorBy: string | undefined

      switch (visualizationType) {
        case "Scatter Plot": {
          xAxis = await vscode.window.showQuickPick(numericColumns, { placeHolder: "Select X-axis column" })

          if (!xAxis) return

          yAxis = await vscode.window.showQuickPick(
            numericColumns.filter((col) => col !== xAxis),
            { placeHolder: "Select Y-axis column" },
          )

          if (!yAxis) return

          colorBy = await vscode.window.showQuickPick(["None", ...columns], {
            placeHolder: "Select column for color coding (optional)",
          })

          this.showScatterPlot(uri, data, xAxis as string, yAxis as string, colorBy === "None" ? undefined : colorBy)
          break
        }

        case "Bar Chart": {
          const categoryColumn = await vscode.window.showQuickPick(columns, { placeHolder: "Select category column" })

          if (!categoryColumn) return

          const valueColumnBar = await vscode.window.showQuickPick(
            numericColumns.filter((col) => col !== categoryColumn),
            { placeHolder: "Select value column" },
          )

          if (!valueColumnBar) return

          this.showBarChart(uri, data, categoryColumn as string, valueColumnBar as string)
          break
        }

        case "Line Chart": {
          const xAxisLine = await vscode.window.showQuickPick(columns, { placeHolder: "Select X-axis column" })

          if (!xAxisLine) return

          const yAxisLine = await vscode.window.showQuickPick(
            numericColumns.filter((col) => col !== xAxisLine),
            { placeHolder: "Select Y-axis column" },
          )

          if (!yAxisLine) return

          this.showLineChart(uri, data, xAxisLine as string, yAxisLine as string)
          break
        }
      }
    } catch (err) {
      vscode.window.showErrorMessage(
        `Error preparing visualization: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  private getNumericColumns(data: Record<string, string | number | boolean | null>[], columns: string[]): string[] {
    if (data.length === 0) {
      return []
    }

    return columns.filter((column) => {
      // Check first few rows to determine if column is numeric
      const sampleSize = Math.min(10, data.length)
      let numericCount = 0

      for (let i = 0; i < sampleSize; i++) {
        const value = data[i][column]
        if (value !== undefined && value !== null && value !== "" && !isNaN(Number(value))) {
          numericCount++
        }
      }

      // If more than 70% of sample values are numeric, consider it a numeric column
      return numericCount / sampleSize > 0.7
    })
  }

  private showScatterPlot(
    uri: vscode.Uri,
    data: Record<string, string | number | boolean | null>[],
    xAxis: string,
    yAxis: string,
    colorBy?: string,
  ) {
    const panel = vscode.window.createWebviewPanel(
      "csvVisualization",
      `Scatter Plot: ${uri.path.split("/").pop()}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
      },
    )

    panel.webview.html = this.getScatterPlotHtml(data, xAxis, yAxis, colorBy)
  }

  private showBarChart(
    uri: vscode.Uri,
    data: Record<string, string | number | boolean | null>[],
    categoryColumn: string,
    valueColumn: string,
  ) {
    const panel = vscode.window.createWebviewPanel(
      "csvVisualization",
      `Bar Chart: ${uri.path.split("/").pop()}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
      },
    )

    panel.webview.html = this.getBarChartHtml(data, categoryColumn, valueColumn)
  }

  private showLineChart(
    uri: vscode.Uri,
    data: Record<string, string | number | boolean | null>[],
    xAxis: string,
    yAxis: string,
  ) {
    const panel = vscode.window.createWebviewPanel(
      "csvVisualization",
      `Line Chart: ${uri.path.split("/").pop()}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
      },
    )

    panel.webview.html = this.getLineChartHtml(data, xAxis, yAxis)
  }

  private getScatterPlotHtml(
    data: Record<string, string | number | boolean | null>[],
    xAxis: string,
    yAxis: string,
    colorBy?: string,
  ): string {
    // Prepare data for the scatter plot
    const plotData = data
      .map((row) => ({
        x: Number(row[xAxis]),
        y: Number(row[yAxis]),
        color: colorBy ? String(row[colorBy]) : undefined,
      }))
      .filter((point) => !isNaN(point.x) && !isNaN(point.y))

    // Get unique color values if colorBy is specified
    let colorValues: string[] = []
    let colorScale = ""

    if (colorBy) {
      colorValues = [...new Set(plotData.map((point) => point.color).filter(Boolean) as string[])]

      // Generate color scale
      const colors = this.generateColors(colorValues.length)
      colorScale = `const colorScale = d3.scaleOrdinal()
        .domain([${colorValues.map((v) => `"${v}"`).join(", ")}])
        .range([${colors.map((c) => `"${c}"`).join(", ")}]);`
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Scatter Plot</title>
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <style>
          body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            margin: 0;
          }
          
          .chart-container {
            width: 100%;
            height: 500px;
            position: relative;
          }
          
          .axis {
            font-size: 12px;
          }
          
          .axis path,
          .axis line {
            fill: none;
            stroke: var(--vscode-editor-foreground);
            shape-rendering: crispEdges;
          }
          
          .axis text {
            fill: var(--vscode-editor-foreground);
          }
          
          .dot {
            stroke: #fff;
          }
          
          .tooltip {
            position: absolute;
            padding: 8px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            pointer-events: none;
            opacity: 0;
          }
          
          .legend {
            margin-top: 20px;
          }
          
          .legend-item {
            display: inline-flex;
            align-items: center;
            margin-right: 15px;
          }
          
          .legend-color {
            width: 12px;
            height: 12px;
            margin-right: 5px;
            border-radius: 2px;
          }
        </style>
      </head>
      <body>
        <h2>Scatter Plot: ${xAxis} vs ${yAxis}</h2>
        <div class="chart-container">
          <div id="scatter-plot"></div>
          ${colorBy ? '<div id="legend" class="legend"></div>' : ""}
        </div>
        
        <script>
          // Data
          const data = ${JSON.stringify(plotData)};
          
          // Dimensions
          const margin = {top: 20, right: 30, bottom: 50, left: 60};
          const width = document.querySelector('.chart-container').clientWidth - margin.left - margin.right;
          const height = 500 - margin.top - margin.bottom;
          
          // Create SVG
          const svg = d3.select('#scatter-plot')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', \`translate(\${margin.left},\${margin.top})\`);
          
          // Create scales
          const xScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.x) * 0.9, d3.max(data, d => d.x) * 1.1])
            .range([0, width]);
            
          const yScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.y) * 0.9, d3.max(data, d => d.y) * 1.1])
            .range([height, 0]);
          
          // Color scale
          ${colorBy ? colorScale : 'const defaultColor = "#4682b4";'}
          
          // Create axes
          const xAxis = d3.axisBottom(xScale);
          const yAxis = d3.axisLeft(yScale);
          
          svg.append('g')
            .attr('class', 'axis')
            .attr('transform', \`translate(0,\${height})\`)
            .call(xAxis);
            
          svg.append('g')
            .attr('class', 'axis')
            .call(yAxis);
          
          // Add axis labels
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', \`translate(\${width/2},\${height + margin.bottom - 10})\`)
            .text('${xAxis}')
            .style('fill', 'var(--vscode-editor-foreground)');
            
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 15)
            .attr('x', -height/2)
            .text('${yAxis}')
            .style('fill', 'var(--vscode-editor-foreground)');
          
          // Create tooltip
          const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip');
          
          // Add dots
          svg.selectAll('.dot')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 5)
            .style('fill', d => ${colorBy ? "colorScale(d.color)" : "defaultColor"})
            .style('opacity', 0.7)
            .on('mouseover', function(event, d) {
              d3.select(this)
                .transition()
                .duration(100)
                .attr('r', 8);
                
              tooltip.transition()
                .duration(100)
                .style('opacity', 0.9);
                
              tooltip.html(
                \`${xAxis}: \${d.x}<br/>
                ${yAxis}: \${d.y}<br/>
                ${colorBy ? `${colorBy}: \${d.color}` : ""}\`
              )
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
              d3.select(this)
                .transition()
                .duration(100)
                .attr('r', 5);
                
              tooltip.transition()
                .duration(200)
                .style('opacity', 0);
            });
          
          // Add legend if colorBy is specified
          ${
            colorBy
              ? `
            const legend = d3.select('#legend');
            
            colorScale.domain().forEach(function(value) {
              const legendItem = legend.append('div')
                .attr('class', 'legend-item');
                
              legendItem.append('div')
                .attr('class', 'legend-color')
                .style('background-color', colorScale(value));
                
              legendItem.append('div')
                .text(value);
            });
          `
              : ""
          }
        </script>
      </body>
      </html>
    `
  }

  private getBarChartHtml(
    data: Record<string, string | number | boolean | null>[],
    categoryColumn: string,
    valueColumn: string,
  ): string {
    // Process data for bar chart
    // Group by category and calculate average value
    const groupedData: BarChartData[] = []
    const categories = [...new Set(data.map((d) => String(d[categoryColumn])))]

    for (const category of categories) {
      const matchingRows = data.filter((d) => String(d[categoryColumn]) === category)
      const avgValue = matchingRows.reduce((sum, d) => sum + Number(d[valueColumn]), 0) / matchingRows.length
      groupedData.push({ category, value: avgValue })
    }

    // Sort by value
    groupedData.sort((a, b) => b.value - a.value)

    // Limit to top 20 categories if there are too many
    const chartData = groupedData.slice(0, 20)

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bar Chart</title>
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <style>
          body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            margin: 0;
          }
          
          .chart-container {
            width: 100%;
            overflow-x: auto;
          }
          
          .axis text {
            fill: var(--vscode-editor-foreground);
            font-size: 12px;
          }
          
          .axis path,
          .axis line {
            fill: none;
            stroke: var(--vscode-editor-foreground);
            shape-rendering: crispEdges;
          }
          
          .bar {
            fill: #4682b4;
          }
          
          .bar:hover {
            fill: #5f9ea0;
          }
          
          .tooltip {
            position: absolute;
            padding: 8px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            pointer-events: none;
            opacity: 0;
          }
        </style>
      </head>
      <body>
        <h2>Bar Chart: ${valueColumn} by ${categoryColumn}</h2>
        <div class="chart-container">
          <div id="bar-chart"></div>
        </div>
        
        <script>
          // Data
          const data = ${JSON.stringify(chartData)};
          
          // Dimensions
          const margin = {top: 20, right: 30, bottom: 120, left: 60};
          const width = Math.max(data.length * 40 + margin.left + margin.right, 600);
          const height = 500 - margin.top - margin.bottom;
          
          // Create SVG
          const svg = d3.select('#bar-chart')
            .append('svg')
            .attr('width', width)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', \`translate(\${margin.left},\${margin.top})\`);
          
          // Create scales
          const xScale = d3.scaleBand()
            .domain(data.map(d => d.category))
            .range([0, width - margin.left - margin.right])
            .padding(0.2);
            
          const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value) * 1.1])
            .range([height, 0]);
          
          // Create axes
          const xAxis = d3.axisBottom(xScale);
          const yAxis = d3.axisLeft(yScale);
          
          svg.append('g')
            .attr('class', 'axis')
            .attr('transform', \`translate(0,\${height})\`)
            .call(xAxis)
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');
            
          svg.append('g')
            .attr('class', 'axis')
            .call(yAxis);
          
          // Add axis labels
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', \`translate(\${(width - margin.left - margin.right) / 2},\${height + margin.bottom - 10})\`)
            .text('${categoryColumn}')
            .style('fill', 'var(--vscode-editor-foreground)');
            
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 15)
            .attr('x', -height / 2)
            .text('${valueColumn}')
            .style('fill', 'var(--vscode-editor-foreground)');
          
          // Create tooltip
          const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip');
          
          // Add bars
          svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.category)!)
            .attr('y', d => yScale(d.value))
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - yScale(d.value))
            .on('mouseover', function(event, d) {
              d3.select(this)
                .transition()
                .duration(100)
                .style('opacity', 0.8);
                
              tooltip.transition()
                .duration(100)
                .style('opacity', 0.9);
                
              tooltip.html(
                \`${categoryColumn}: \${d.category}<br/>
                ${valueColumn}: \${d.value.toFixed(2)}\`
              )
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
              d3.select(this)
                .transition()
                .duration(100)
                .style('opacity', 1);
                
              tooltip.transition()
                .duration(200)
                .style('opacity', 0);
            });
        </script>
      </body>
      </html>
    `
  }

  private getLineChartHtml(
    data: Record<string, string | number | boolean | null>[],
    xAxis: string,
    yAxis: string,
  ): string {
    // Process data for line chart
    const chartData = data
      .map((d) => ({
        x: String(d[xAxis]),
        y: Number(d[yAxis]),
      }))
      .filter((d) => !isNaN(d.y))

    // Sort by x value
    chartData.sort((a, b) => {
      // Try to sort numerically first
      const numA = Number(a.x)
      const numB = Number(b.x)

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      // Fall back to string comparison
      return String(a.x).localeCompare(String(b.x))
    })

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Line Chart</title>
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <style>
          body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            margin: 0;
          }
          
          .chart-container {
            width: 100%;
          }
          
          .axis text {
            fill: var(--vscode-editor-foreground);
            font-size: 12px;
          }
          
          .axis path,
          .axis line {
            fill: none;
            stroke: var(--vscode-editor-foreground);
            shape-rendering: crispEdges;
          }
          
          .line {
            fill: none;
            stroke: #4682b4;
            stroke-width: 2;
          }
          
          .dot {
            fill: #4682b4;
            stroke: #fff;
          }
          
          .tooltip {
            position: absolute;
            padding: 8px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            pointer-events: none;
            opacity: 0;
          }
        </style>
      </head>
      <body>
        <h2>Line Chart: ${yAxis} by ${xAxis}</h2>
        <div class="chart-container">
          <div id="line-chart"></div>
        </div>
        
        <script>
          // Data
          const data = ${JSON.stringify(chartData)};
          
          // Dimensions
          const margin = {top: 20, right: 30, bottom: 60, left: 60};
          const width = 800 - margin.left - margin.right;
          const height = 500 - margin.top - margin.bottom;
          
          // Create SVG
          const svg = d3.select('#line-chart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', \`translate(\${margin.left},\${margin.top})\`);
          
          // Create scales
          const xScale = d3.scalePoint()
            .domain(data.map(d => d.x))
            .range([0, width])
            .padding(0.5);
            
          const yScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.y) * 0.9, d3.max(data, d => d.y) * 1.1])
            .range([height, 0]);
          
          // Create axes
          const xAxis = d3.axisBottom(xScale);
          const yAxis = d3.axisLeft(yScale);
          
          svg.append('g')
            .attr('class', 'axis')
            .attr('transform', \`translate(0,\${height})\`)
            .call(xAxis)
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');
            
          svg.append('g')
            .attr('class', 'axis')
            .call(yAxis);
          
          // Add axis labels
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', \`translate(\${width/2},\${height + margin.bottom - 10})\`)
            .text('${xAxis}')
            .style('fill', 'var(--vscode-editor-foreground)');
            
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 15)
            .attr('x', -height / 2)
            .text('${yAxis}')
            .style('fill', 'var(--vscode-editor-foreground)');
          
          // Create line generator
          const line = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y));
          
          // Create tooltip
          const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip');
          
          // Add line
          svg.append('path')
            .datum(data)
            .attr('class', 'line')
            .attr('d', line);
          
          // Add dots
          svg.selectAll('.dot')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 4)
            .on('mouseover', function(event, d) {
              d3.select(this)
                .transition()
                .duration(100)
                .attr('r', 6);
                
              tooltip.transition()
                .duration(100)
                .style('opacity', 0.9);
                
              tooltip.html(
                \`${xAxis}: \${d.x}<br/>
                ${yAxis}: \${d.y.toFixed(2)}\`
              )
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
              d3.select(this)
                .transition()
                .duration(100)
                .attr('r', 4);
                
              tooltip.transition()
                .duration(200)
                .style('opacity', 0);
            });
        </script>
      </body>
      </html>
    `
  }

  private generateColors(count: number): string[] {
    const colors = [
      "#4e79a7",
      "#f28e2c",
      "#e15759",
      "#76b7b2",
      "#59a14f",
      "#edc949",
      "#af7aa1",
      "#ff9da7",
      "#9c755f",
      "#bab0ab",
    ]

    if (count <= colors.length) {
      return colors.slice(0, count)
    }

    // If we need more colors, generate them
    const result = [...colors]

    for (let i = colors.length; i < count; i++) {
      const hue = (i * 137.5) % 360
      result.push(`hsl(${hue}, 70%, 60%)`)
    }

    return result
  }
}

