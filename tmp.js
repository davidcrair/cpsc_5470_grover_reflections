
    // Parameters
    const n = 4;
    const N = 2 ** n;
    const numIterations = 8;
    const frameMs = 550;
    const theta = Math.asin(1 / Math.sqrt(N));

    const axisLen = 1.15;
    const plusDir = [Math.cos(theta), Math.sin(theta)];

    const amplitudeData = (angle) => {
      const ampMarked = Math.sin(angle);
      const ampOther = Math.cos(angle) / Math.sqrt(N - 1);
      const amps = Array.from({ length: N }, (_, i) => (i === 0 ? ampMarked : ampOther));
      const mean = amps.reduce((a, b) => a + b, 0) / N;
      return { amps, mean };
    };

    const probData = (angle) => {
      const pMarked = Math.sin(angle) ** 2;
      return [pMarked, 1 - pMarked];
    };

    const xTicks = Array.from({ length: N }, (_, i) => i.toString(2).padStart(n, "0"));

    // Color palette for iterations (inspired by the reference image)
    const iterationColors = [
      "#1f2937", // Initial state (dark gray/black)
      "#DC2626", // Iteration 1 (red)
      "#059669", // Iteration 2 (green)
      "#2563EB", // Iteration 3 (blue)
      "#7C3AED", // Iteration 4 (purple)
      "#D97706", // Iteration 5 (amber)
      "#0891B2", // Iteration 6 (cyan)
      "#BE185D", // Iteration 7 (pink)
      "#4338CA", // Iteration 8 (indigo)
    ];

    // Pre-compute all state angles for history tracking
    const stateHistory = [];
    stateHistory.push({ angle: theta, label: "$\\lvert +^{n} \\rangle$", iteration: 0, isOracle: false });
    for (let i = 0; i < numIterations; i++) {
      const current = theta + 2 * theta * i;
      const oracle = -current;
      stateHistory.push({ angle: oracle, label: `$|\\psi_{${i + 1}}'\\rangle$`, iteration: i + 1, isOracle: true });
      const diffusion = 2 * theta - oracle;
      stateHistory.push({ angle: diffusion, label: `$|\\psi_{${i + 1}}\\rangle$`, iteration: i + 1, isOracle: false });
    }

    const buildFrame = (frameIndex, stageText) => {
      const currentState = stateHistory[frameIndex];
      const angle = currentState.angle;
      const [pMarked, pOther] = probData(angle);
      const { amps, mean } = amplitudeData(angle);
      const probsSq = amps.map((a) => a * a);

      // Build annotations for all previous states + current state
      const annotations = [
        // Geometric plot axis labels
        { x: 1.15, y: -0.08, text: "$|x_{\\perp}\\rangle$", showarrow: false, font: { size: 14, color: "#374151" }, xref: "x", yref: "y" },
        { x: 0.08, y: 1.18, text: "$|x^{*}\\rangle$", showarrow: false, font: { size: 14, color: "#374151" }, xref: "x", yref: "y" },
        // Reflection direction |+^n>
        { x: plusDir[0] * axisLen * 0.75, y: plusDir[1] * axisLen * 1.15, text: "$|+^{n}\\rangle$", showarrow: false, font: { size: 13, color: "#111827" }, xref: "x", yref: "y" },
        { x: plusDir[0] * axisLen, y: plusDir[1] * axisLen, ax: 0, ay: 0, xref: "x", yref: "y", axref: "x", ayref: "y", showarrow: true, arrowhead: 2, arrowsize: 2, arrowwidth: 3, arrowcolor: "#111827", text: "" },
        // Subplot titles
        { x: 0.14, y: 1.06, xref: "paper", yref: "paper", text: "<b>State Space</b>", showarrow: false, font: { size: 15, color: "#1f2937" } },
        { x: 0.42, y: 1.06, xref: "paper", yref: "paper", text: "<b>Probabilities</b>", showarrow: false, font: { size: 15, color: "#1f2937" } },
        { x: 0.78, y: 1.06, xref: "paper", yref: "paper", text: "<b>Amplitudes</b>", showarrow: false, font: { size: 15, color: "#1f2937" } },
        // Current step info
        { x: 0.5, y: -0.02, xref: "paper", yref: "paper", text: stageText, showarrow: false, font: { size: 14, color: "#6b7280" } },
      ];

      // Add arrows for all states up to current frame
      // Diffusion states = solid arrows, Oracle states = dashed arrows
      const extraShapes = [];

      for (let i = 0; i <= frameIndex; i++) {
        const state = stateHistory[i];
        const color = iterationColors[state.iteration] || iterationColors[iterationColors.length - 1];
        const x = Math.cos(state.angle);
        const y = Math.sin(state.angle);
        const isCurrent = (i === frameIndex);

        // Calculate text offset direction (outward from origin)
        const labelOffset = 0.12;
        const labelX = x * (1 + labelOffset);
        const labelY = y * (1 + labelOffset);

        // Skip drawing the initial |+^n> arrow here (we already render a permanent black vector)
        if (state.iteration === 0) {
          continue;
        }

        // Add black dashed connecting arrow from previous state to this state (if not the first state)
        if (i > 0) {
          const prevState = stateHistory[i - 1];
          const prevX = Math.cos(prevState.angle);
          const prevY = Math.sin(prevState.angle);

          // Dashed line part (shape)
          extraShapes.push({
            type: "line",
            x0: prevX, y0: prevY,
            x1: x, y1: y,
            xref: "x", yref: "y",
            line: { color: "#374151", width: 1.5, dash: "dot" }
          });

          // Arrowhead at the tip (annotation)
          // Position arrowhead slightly back from the tip to show direction
          const dx = x - prevX;
          const dy = y - prevY;
          const len = Math.sqrt(dx * dx + dy * dy);
          const arrowStartX = x - (dx / len) * 0.12;
          const arrowStartY = y - (dy / len) * 0.12;

          annotations.push({
            x: x, y: y,
            ax: arrowStartX, ay: arrowStartY,
            xref: "x", yref: "y", axref: "x", ayref: "y",
            showarrow: true,
            arrowhead: 2,
            arrowsize: 1.2,
            arrowwidth: 1.5,
            arrowcolor: "#374151",
            text: ""
          });
        }

        if (state.isOracle) {
          // Oracle states shown as dashed arrows from origin
          extraShapes.push({
            type: "line",
            x0: 0, y0: 0,
            x1: x, y1: y,
            xref: "x", yref: "y",
            line: { color: color, width: isCurrent ? 2.5 : 1.5, dash: "dash" }
          });

          // Add arrowhead at the tip
          annotations.push({
            x: x, y: y,
            ax: x * 0.85, ay: y * 0.85,
            xref: "x", yref: "y", axref: "x", ayref: "y",
            showarrow: true, arrowhead: 2,
            arrowsize: isCurrent ? 2 : 1.2,
            arrowwidth: isCurrent ? 2 : 1.5,
            arrowcolor: color,
            text: "",
            font: { size: 12, color: color }
          });

          // Add label at the tip (persist across frames)
          annotations.push({
            x: labelX, y: labelY,
            xref: "x", yref: "y",
            showarrow: false,
            text: state.label,
            font: { size: isCurrent ? 12 : 10, color: color }
          });
        } else {
          // Diffusion states (and initial state) shown as solid arrows
          // Arrow from origin to tip
          annotations.push({
            x: x, y: y, ax: 0, ay: 0,
            xref: "x", yref: "y", axref: "x", ayref: "y",
            showarrow: true,
            arrowhead: 2,
            arrowsize: isCurrent ? 2 : 1.5,
            arrowwidth: isCurrent ? 3 : 2,
            arrowcolor: color,
            text: "",
            font: { size: isCurrent ? 13 : 11, color: color }
          });

          // Add label at the tip (separate annotation)
          const labelText = state.iteration === 0 ? "" : state.label;
          if (labelText) {
            annotations.push({
              x: labelX, y: labelY,
              xref: "x", yref: "y",
              showarrow: false,
              text: labelText,
              font: { size: isCurrent ? 13 : 11, color: color }
            });
          }
        }
      }

      // Combine base shapes with extra shapes (oracle lines + connecting lines)
      const frameShapes = [...shapes, ...extraShapes];

      return {
        name: stateHistory[frameIndex].iteration === 0 ? "0 |+^n>" :
          (stateHistory[frameIndex].isOracle ?
            `${stateHistory[frameIndex].iteration}a oracle` :
            `${stateHistory[frameIndex].iteration}b diffusion`),
        data: [
          { y: [pMarked, pOther] },
          { x: xTicks, y: amps, customdata: probsSq },
          { x: xTicks, y: Array(N).fill(mean) },
        ],
        layout: { annotations, shapes: frameShapes }
      };
    };

    // Initial data
    const startAngle = theta;
    const { amps: amps0, mean: mean0 } = amplitudeData(startAngle);
    const probs0 = probData(startAngle);

    const data = [
      {
        type: "bar",
        x: ["marked $|x^{*}\\rangle$", "unmarked subspace"],
        y: probs0,
        marker: { color: ["#F26B38", "#CBD5E1"] },
        hovertemplate: "%{y:.3f}",
        xaxis: "x2",
        yaxis: "y2"
      },
      {
        type: "bar",
        x: xTicks,
        y: amps0,
        customdata: amps0.map((a) => a * a),
        marker: { color: ["#F26B38"].concat(Array(N - 1).fill("#CBD5E1")) },
        hovertemplate: "state %{x}<br>amp %{y:.3f}<br>prob %{customdata:.3f}",
        xaxis: "x3",
        yaxis: "y3"
      },
      {
        type: "scatter",
        mode: "lines",
        x: xTicks,
        y: Array(N).fill(mean0),
        line: { color: "#10B981", dash: "dash" },
        hoverinfo: "skip",
        xaxis: "x3",
        yaxis: "y3"
      }
    ];

    // Shapes for axes and |+^n> reflection line
    const shapes = [
      { type: "line", x0: -axisLen, y0: 0, x1: axisLen, y1: 0, line: { color: "#6B7280", width: 1.5 } },
      { type: "line", x0: 0, y0: -axisLen, x1: 0, y1: axisLen, line: { color: "#6B7280", width: 1.5, dash: "dash" } },
    ];

    // Layout
    const layout = {
      height: 620,
      width: 1400,
      margin: { t: 80, r: 40, l: 60, b: 90 },
      bargap: 0.25,
      showlegend: false,
      title: { text: "Grover's Search as Alternating Reflections", x: 0.5, font: { size: 20 } },
      xaxis: { anchor: "y", domain: [0.0, 0.28], range: [-1.25, 1.25], showgrid: false, zeroline: false },
      yaxis: { anchor: "x", domain: [0, 1], range: [-1.25, 1.25], showgrid: false, zeroline: false, scaleanchor: "x", scaleratio: 1 },
      xaxis2: { anchor: "y2", domain: [0.34, 0.50] },
      yaxis2: { anchor: "x2", domain: [0, 1], range: [0, 1], title: { text: "Probability" } },
      xaxis3: { anchor: "y3", domain: [0.56, 1], title: { text: "State" }, type: "category" },
      yaxis3: { anchor: "x3", domain: [0, 1], range: [-1, 1], title: { text: "Amplitude" } },
      shapes,
      annotations: [
        // Geometric plot axis labels
        { x: 1.15, y: -0.08, text: "|x⟂⟩", showarrow: false, font: { size: 14, color: "#374151" }, xref: "x", yref: "y" },
        { x: 0.08, y: 1.18, text: "|x*⟩", showarrow: false, font: { size: 14, color: "#374151" }, xref: "x", yref: "y" },
        // Reflection line label
        { x: plusDir[0] * axisLen * 0.75, y: plusDir[1] * axisLen * 1.15, text: "|+ⁿ⟩", showarrow: false, font: { size: 13, color: "#10B981" }, xref: "x", yref: "y" },
        // Subplot titles
        { x: 0.14, y: 1.06, xref: "paper", yref: "paper", text: "<b>State Space</b>", showarrow: false, font: { size: 15, color: "#1f2937" } },
        { x: 0.42, y: 1.06, xref: "paper", yref: "paper", text: "<b>Probabilities</b>", showarrow: false, font: { size: 15, color: "#1f2937" } },
        { x: 0.78, y: 1.06, xref: "paper", yref: "paper", text: "<b>Amplitudes</b>", showarrow: false, font: { size: 15, color: "#1f2937" } },
        // Current step info (will be updated in frames)
        { x: 0.5, y: -0.02, xref: "paper", yref: "paper", text: `θ = ${(theta * 180 / Math.PI).toFixed(2)}° — Start at |+ⁿ⟩`, showarrow: false, font: { size: 14, color: "#6b7280" } },
      ],
      sliders: [],
      updatemenus: [
        {
          type: "buttons",
          showactive: true,
          x: 0.99, y: 1.08, xanchor: "right",
          buttons: [
            { label: "▶ Play", method: "animate", args: [null, { frame: { duration: frameMs, redraw: true }, transition: { duration: 180 }, fromcurrent: true }] },
            { label: "⏸ Pause", method: "animate", args: [[null], { mode: "immediate", frame: { duration: 0, redraw: false } }] },
          ]
        }
      ]
    };

    // Frames - build using state history
    const frames = [];
    const stageTexts = [`Start at $|+^{n}\\rangle$ ($\\theta = ${(theta * 180 / Math.PI).toFixed(2)}^{\\circ}$)`];
    for (let i = 0; i < numIterations; i++) {
      stageTexts.push(`Iteration ${i + 1}: oracle reflects $|\\psi\\rangle$ across $|x_{\\perp}\\rangle$`);
      stageTexts.push(`Iteration ${i + 1}: diffusion reflects across $|+^{n}\\rangle$, rotating by $2\\theta$`);
    }

    for (let i = 0; i < stateHistory.length; i++) {
      frames.push(buildFrame(i, stageTexts[i]));
    }

    layout.sliders = [
      {
        active: 0,
        len: 0.9,
        x: 0.05,
        y: -0.05,
        currentvalue: { prefix: "Step: " },
        steps: frames.map(f => ({
          label: f.name,
          method: "animate",
          args: [[f.name], { mode: "immediate", frame: { duration: frameMs, redraw: true }, transition: { duration: 180 } }]
        }))
      }
    ];

    const opinfo = document.getElementById('opinfo');
    const formatOpText = (frameIndex) => {
      const state = stateHistory[frameIndex];
      if (state.iteration === 0) {
        return String.raw`\\text{Init: } |\\psi_0\\rangle = |+^n\\rangle`;
      }
      const k = state.iteration;
      if (state.isOracle) {
        return String.raw`\\text{Step ${k}a: } O_f^\\pm \\text{ (phase oracle)}\\\\ \\text{Before: } |\\psi_{${k-1}}\\rangle\\\\ \\text{After: } |\\psi_{${k}}'\\rangle = O_f^\\pm |\\psi_{${k-1}}\\rangle`;
      }
      return String.raw`\\text{Step ${k}b: } -S_+^\\pm \\text{ (diffusion)}\\\\ \\text{Before: } |\\psi_{${k}}'\\rangle\\\\ \\text{After: } |\\psi_{${k}}\\rangle = -S_+^\\pm |\\psi_{${k}}'\\rangle`;
    };

    const setOpInfo = (frameIndex) => {
      const body = formatOpText(frameIndex);
      opinfo.innerHTML = `$$${body}$$<br>$$\\lvert \\psi_k \\rangle = (-S_+^\\pm O_f^\\pm)^k \\lvert +^n \\rangle, \\quad \\lvert \\psi_k' \\rangle = O_f^\\pm (-S_+^\\pm O_f^\\pm)^k \\lvert +^n \\rangle$$`;
      if (window.MathJax && window.MathJax.Hub) {
        window.MathJax.Hub.Queue([\"Typeset\", window.MathJax.Hub, opinfo]);
      }
    };

    Plotly.newPlot('grover', data, layout, { responsive: true }).then(() => {
      Plotly.addFrames('grover', frames);

      // Custom handlers to properly update annotations when slider/animation changes
      // This fixes the issue where annotations don't disappear when going backwards
      const groverDiv = document.getElementById('grover');

      // Track current frame to properly update on any change
      let lastFrameIndex = 0;

      const updateToFrame = (frameIndex) => {
        if (frameIndex !== undefined && frameIndex !== lastFrameIndex) {
          lastFrameIndex = frameIndex;
          const frame = frames[frameIndex];
          if (frame && frame.layout) {
            // Use relayout to properly replace annotations and shapes
            Plotly.relayout('grover', {
              annotations: frame.layout.annotations,
              shapes: frame.layout.shapes
            });
            setOpInfo(frameIndex);
          }
        }
      };

      // Listen for slider changes
      groverDiv.on('plotly_sliderchange', function (eventData) {
        updateToFrame(eventData.slider.active);
      });

      // Also listen for animation frame changes
      groverDiv.on('plotly_animatingframe', function (eventData) {
        // Find the frame index by name
        const frameName = eventData.name;
        const frameIndex = frames.findIndex(f => f.name === frameName);
        if (frameIndex >= 0) {
          updateToFrame(frameIndex);
        }
      });

      // Ensure MathJax renders the explainer section
      if (window.MathJax && window.MathJax.Hub) {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, document.getElementById('explainer')]);
      }

      // Initialize op info
      setOpInfo(0);
    });
  