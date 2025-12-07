import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Default parameters (can be overridden in-browser via the n-slider we inject below)
DEFAULT_N = 4
MAX_N_SLIDER = 9  # cap to keep basis-state bar plot readable (<=512 bars) -- unused while slider disabled
NUM_ITERATIONS = 8
FRAME_MS = 550
DIV_ID = "grover-graph"


def theta_from_n(n: int) -> float:
    return np.arcsin(1 / np.sqrt(2**n))


def state_coords(angle: float) -> tuple[float, float]:
    return float(np.cos(angle)), float(np.sin(angle))


def probabilities(angle: float) -> tuple[float, float]:
    p_marked = float(np.sin(angle) ** 2)
    return p_marked, 1 - p_marked


def basis_amplitudes(angle: float, n: int) -> tuple[np.ndarray, float]:
    """Return per-state amplitudes (marked state = |0...0>) and mean amplitude."""
    N = 2**n
    amp_marked = np.sin(angle)
    amp_other = np.cos(angle) / np.sqrt(N - 1)
    amps = np.full(N, amp_other, dtype=float)
    amps[0] = amp_marked
    return amps, float(np.mean(amps))


def build_base_figure(n: int) -> go.Figure:
    theta = theta_from_n(n)
    start_angle = theta
    start_x, start_y = state_coords(start_angle)
    p0_marked, p0_other = probabilities(start_angle)

    fig = make_subplots(
        rows=1,
        cols=3,
        column_widths=[0.32, 0.18, 0.50],
        specs=[[{"type": "xy"}, {"type": "bar"}, {"type": "bar"}]],
        subplot_titles=("", "", ""),
    )

    fig.add_trace(
        go.Bar(
            x=["marked |x*>", "unmarked subspace"],
            y=[p0_marked, p0_other],
            marker_color=["#F26B38", "#CBD5E1"],
            name="Probabilities",
            hovertemplate="%{y:.3f}",
            showlegend=False,
        ),
        row=1,
        col=2,
    )

    # Basis amplitudes panel
    amps0, mean_amp0 = basis_amplitudes(start_angle, n)
    x_ticks = [f"{i:0{n}b}" for i in range(len(amps0))]
    fig.add_trace(
        go.Bar(
            x=x_ticks,
            y=amps0,
            marker_color=["#F26B38"] + ["#CBD5E1"] * (len(amps0) - 1),
            showlegend=False,
            name="Amplitudes",
            hovertemplate="state %{x}<br>amp %{y:.3f}<br>prob %{customdata:.3f}",
            customdata=amps0**2,
        ),
        row=1,
        col=3,
    )
    fig.add_trace(
        go.Scatter(
            x=x_ticks,
            y=[mean_amp0] * len(amps0),
            mode="lines",
            line=dict(color="#10B981", dash="dash"),
            name="Mean amplitude",
            showlegend=False,
        ),
        row=1,
        col=3,
    )

    axis_len = 1.15
    plus_dir = np.array([np.cos(theta), np.sin(theta)])
    fig.update_layout(
        shapes=[
            dict(
                type="line",
                x0=-axis_len,
                y0=0,
                x1=axis_len,
                y1=0,
                line=dict(color="#6B7280", width=1.5),
            ),
            dict(
                type="line",
                x0=0,
                y0=-axis_len,
                x1=0,
                y1=axis_len,
                line=dict(color="#6B7280", width=1.5, dash="dash"),
            ),
            dict(
                type="line",
                x0=-axis_len * plus_dir[0],
                y0=-axis_len * plus_dir[1],
                x1=axis_len * plus_dir[0],
                y1=axis_len * plus_dir[1],
                line=dict(color="#10B981", width=2.5),
            ),
        ],
        annotations=[
            # dict(
            #     x=-1.3,
            #     y=-0.10,
            #     text="|x⟂⟩",
            #     showarrow=False,
            #     font=dict(size=12),
            # ),
            # dict(
            #     x=0,
            #     y=axis_len + 0.05,
            #     text="|x*>",
            #     showarrow=False,
            #     font=dict(size=12),
            # ),
            # dict(
            #     x=plus_dir[0] * axis_len * 0.95,
            #     y=plus_dir[1] * axis_len * 0.95,
            #     text="|+^n⟩ reflection line",
            #     showarrow=False,
            #     font=dict(size=12, color="#10B981"),
            # ),
            # dict(
            #     x=0.31,
            #     y=1.08,
            #     xref="paper",
            #     yref="paper",
            #     text=f"Start at |+^n⟩ (θ = {np.degrees(theta):.2f}° from |x⟂⟩)",
            #     showarrow=False,
            #     font=dict(size=15),
            # ),
        ],
        title=dict(
            text="Grover's Search as Alternating Reflections",
            x=0.5,
            font=dict(size=20),
        ),
        height=620,
        width=1400,
        margin=dict(t=80, r=40, l=60, b=90),
        bargap=0.25,
    )

    fig.update_xaxes(
        range=[-1.25, 1.25], zeroline=False, showgrid=False, row=1, col=1
    )
    fig.update_yaxes(
        range=[-1.25, 1.25],
        zeroline=False,
        showgrid=False,
        scaleanchor="x",
        scaleratio=1,
        row=1,
        col=1,
    )
    fig.update_yaxes(range=[0, 1], row=1, col=2, title_text="Probability")
    fig.update_yaxes(title_text="Amplitude", row=1, col=3, range=[-1, 1])
    fig.update_xaxes(title_text="State", row=1, col=3)
    return fig


def build_frames(n: int) -> list[go.Frame]:
    theta = theta_from_n(n)
    start_angle = theta
    frames: list[go.Frame] = []

    def frame(angle: float, label: str, stage: str) -> go.Frame:
        x, y = state_coords(angle)
        p_marked, p_other = probabilities(angle)
        amps, mean_amp = basis_amplitudes(angle, n)
        x_ticks = [f"{i:0{n}b}" for i in range(len(amps))]
        probs_sq = amps**2
        arrow = dict(
            x=x,
            y=y,
            ax=0,
            ay=0,
            xref="x1",
            yref="y1",
            axref="x1",
            ayref="y1",
            showarrow=True,
            arrowhead=3,
            arrowsize=1.6,
            arrowwidth=4,
            arrowcolor="#355E9A",
        )
        return go.Frame(
            name=label,
            data=[
                go.Bar(y=[p_marked, p_other]),
                go.Bar(
                    x=x_ticks,
                    y=amps,
                    marker_color=["#F26B38"] + ["#CBD5E1"] * (len(amps) - 1),
                    customdata=probs_sq,
                    hovertemplate="state %{x}<br>amp %{y:.3f}<br>prob %{customdata:.3f}",
                ),
                go.Scatter(x=x_ticks, y=[mean_amp] * len(amps)),
            ],
            layout=go.Layout(
                yaxis3=dict(range=[-1, 1]),
                annotations=[
                    arrow,
                    # dict(x=-1.3, y=-0.10, text="|x⟂⟩", showarrow=False, font=dict(size=12), xref="x1", yref="y1"),
                    dict(
                        x=0,
                        y=1.2,
                        text="|x*>",
                        showarrow=False,
                        font=dict(size=12),
                        xref="x1",
                        yref="y1",
                    ),
                    dict(
                        x=0.31,
                        y=1.08,
                        xref="paper",
                        yref="paper",
                        text=stage,
                        showarrow=False,
                        font=dict(size=15),
                    ),
                ],
            ),
        )

    frames.append(
        frame(
            start_angle,
            "0 |+^n>",
            f"Start at |+^n⟩ (θ = {np.degrees(theta):.2f}°)",
        )
    )

    for i in range(NUM_ITERATIONS):
        current_angle = start_angle + 2 * theta * i
        oracle_angle = -current_angle
        frames.append(
            frame(
                oracle_angle,
                f"{i + 1}a oracle",
                f"Iteration {i + 1}: oracle reflects |ψ⟩ across |x⟂⟩ (phase flip on |x*>)",
            )
        )
        diffusion_angle = 2 * theta - oracle_angle
        frames.append(
            frame(
                diffusion_angle,
                f"{i + 1}b diffusion",
                f"Iteration {i + 1}: diffusion reflects across |+^n⟩, rotating by 2θ",
            )
        )
    return frames


def main() -> None:
    fig = build_base_figure(DEFAULT_N)
    frames = build_frames(DEFAULT_N)
    fig.frames = frames

    slider_steps = [
        dict(
            method="animate",
            args=[
                [f.name],
                dict(
                    mode="immediate",
                    frame=dict(duration=FRAME_MS, redraw=True),
                    transition=dict(duration=180),
                ),
            ],
            label=f.name,
        )
        for f in frames
    ]

    fig.update_layout(
        sliders=[
            dict(
                active=0,
                steps=slider_steps,
                len=0.92,
                x=0.05,
                y=-0.07,
                currentvalue=dict(prefix="Step: "),
                pad=dict(t=20, b=10),
            )
        ],
        updatemenus=[
            dict(
                type="buttons",
                showactive=True,
                x=0.99,
                y=1.15,
                xanchor="right",
                buttons=[
                    dict(
                        label="▶ Play",
                        method="animate",
                        args=[
                            None,
                            dict(
                                frame=dict(duration=FRAME_MS, redraw=True),
                                transition=dict(duration=180),
                                fromcurrent=True,
                            ),
                        ],
                    ),
                    dict(
                        label="⏸ Pause",
                        method="animate",
                        args=[
                            [None],
                            dict(
                                mode="immediate",
                                frame=dict(duration=0, redraw=False),
                            ),
                        ],
                    ),
                ],
            )
        ],
    )

    # Build HTML manually so our custom JS lives in its own <script> block (avoids Plotly post_script nesting).
    plot_html = fig.to_html(
        full_html=False, include_plotlyjs="cdn", div_id=DIV_ID
    )

    # Slider temporarily disabled; keep a no-op script placeholder.
    custom_js = ""

    html = f"<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>{plot_html}<script>{custom_js}</script></body></html>"

    with open("interactive_graph.html", "w", encoding="utf-8") as f:
        f.write(html)
    print(
        "Wrote interactive_graph.html with Grover reflection animation and n-slider."
    )


if __name__ == "__main__":
    main()
