import re
from collections import defaultdict
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib import rcParams
from matplotlib.ticker import FuncFormatter


BASE_DIR = Path(__file__).resolve().parent
POST_PATH = BASE_DIR / "source" / "_posts" / "行旅杂记.md"

rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "DejaVu Sans"]
rcParams["axes.unicode_minus"] = False
rcParams["figure.dpi"] = 300
rcParams["savefig.pad_inches"] = 0.06

FIGURE_BACKGROUND = "#FFFFFF"
AXIS_BACKGROUND = "#FFF8E8"
SPINE_COLOR = "#B5AA98"
GRID_COLOR = "#D8CCBC"
TEXT_COLOR = "#3A332C"
SUBTLE_TEXT_COLOR = "#6E6256"

CHART_FIGSIZE = (11.2, 6.4)
TITLE_FONT_SIZE = 16
AXIS_LABEL_FONT_SIZE = 12
TICK_FONT_SIZE = 10
ANNOTATION_FONT_SIZE = 9
LEGEND_FONT_SIZE = 10
SUMMARY_FONT_SIZE = 10
TITLE_PAD = 18
LINE_WIDTH = 2.8
MARKER_SIZE = 7.4
MARKER_EDGE_WIDTH = 2
LEFT_MARGIN = 0.09
RIGHT_MARGIN = 0.91
BOTTOM_MARGIN = 0.12
TOP_MARGIN = 0.84

CITY_DATA = {
    "years": ["大学前", "2022-2023", "2024", "2025", "2026"],
    "new_cities": [19, 2, 21, 21, 11],
    "cumulative_cities": [19, 21, 42, 63, 74],
}


def set_axis_style(ax, *, right_axis=False):
    """Apply a clean, warm visual style to an axis."""
    ax.set_facecolor(AXIS_BACKGROUND)
    ax.set_axisbelow(True)
    ax.spines["top"].set_visible(False)
    ax.spines["bottom"].set_color(SPINE_COLOR)

    if right_axis:
        ax.spines["left"].set_visible(False)
        ax.spines["right"].set_color(SPINE_COLOR)
    else:
        ax.spines["left"].set_color(SPINE_COLOR)
        ax.spines["right"].set_visible(False)
        ax.grid(True, axis="y", linestyle=(0, (4, 4)), linewidth=0.8, color=GRID_COLOR)

    ax.tick_params(axis="both", colors=TEXT_COLOR, labelsize=TICK_FONT_SIZE)


def apply_figure_layout(fig):
    """Keep all exported charts at the same size and margin rhythm."""
    fig.subplots_adjust(
        left=LEFT_MARGIN,
        right=RIGHT_MARGIN,
        bottom=BOTTOM_MARGIN,
        top=TOP_MARGIN,
    )


def padded_upper_limit(values):
    """Add a little breathing room above the highest point."""
    maximum = max(values) if values else 0
    if maximum <= 0:
        return 1
    return maximum * 1.18 + max(1, maximum * 0.02)


def lower_padding_from_zero(values, min_padding):
    """Keep a small blank band below zero so low labels do not touch the x-axis."""
    maximum = max(values) if values else 0
    if maximum <= 0:
        return -min_padding
    return -max(maximum * 0.08, min_padding)


def annotate_series(
    ax,
    x_values,
    y_values,
    color,
    formatter=None,
    *,
    offset=8,
    vertical_alignment="bottom",
    skip_zeros=False,
):
    """Add compact labels near data points."""
    if formatter is None:
        formatter = lambda value: f"{int(value)}"

    for x_value, y_value in zip(x_values, y_values):
        if skip_zeros and y_value == 0:
            continue

        ax.annotate(
            formatter(y_value),
            xy=(x_value, y_value),
            xytext=(0, offset),
            textcoords="offset points",
            ha="center",
            va=vertical_alignment,
            fontsize=ANNOTATION_FONT_SIZE,
            color="white",
            fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.25", fc=color, ec="none", alpha=0.9),
            zorder=7,
            clip_on=False,
            annotation_clip=False,
        )


def draw_area_chart(labels, values, title, ylabel, output_name, line_color, fill_color, marker):
    """Draw a single-axis line chart with a soft area fill."""
    fig, ax = plt.subplots(figsize=CHART_FIGSIZE)
    fig.patch.set_facecolor(FIGURE_BACKGROUND)
    set_axis_style(ax)

    x_values = list(range(len(labels)))
    ax.plot(
        x_values,
        values,
        color=line_color,
        linewidth=LINE_WIDTH,
        marker=marker,
        markersize=MARKER_SIZE,
        markerfacecolor="white",
        markeredgecolor=line_color,
        markeredgewidth=MARKER_EDGE_WIDTH,
        solid_capstyle="round",
        zorder=3,
    )
    ax.fill_between(x_values, values, color=fill_color, alpha=0.35, zorder=1)

    annotate_series(ax, x_values, values, line_color)

    ax.set_xticks(x_values)
    ax.set_xticklabels(labels)
    ax.set_xlim(-0.2, len(labels) - 0.8)
    ax.set_ylim(0, padded_upper_limit(values))
    ax.set_ylabel(ylabel, fontsize=AXIS_LABEL_FONT_SIZE, color=SUBTLE_TEXT_COLOR)
    ax.set_title(title, fontsize=TITLE_FONT_SIZE, fontweight="bold", pad=TITLE_PAD, color=TEXT_COLOR)
    ax.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{int(value)}"))

    apply_figure_layout(fig)
    fig.savefig(BASE_DIR / output_name, facecolor=fig.get_facecolor())
    plt.close(fig)


def extract_table_lines(markdown_text, marker):
    """Locate a Markdown table by its nearby section marker."""
    lines = markdown_text.splitlines()
    collected_lines = []
    found_marker = False
    collecting_table = False

    for raw_line in lines:
        line = raw_line.strip()

        if not found_marker:
            if marker in line:
                found_marker = True
            continue

        if line.startswith("|"):
            collected_lines.append(line)
            collecting_table = True
            continue

        if collecting_table:
            break

    if not collected_lines:
        raise ValueError(f"未找到 {marker} 对应的 Markdown 表格。")

    return collected_lines


def parse_markdown_row(line):
    """Split a Markdown table row into cells."""
    stripped_line = line.strip()
    if stripped_line.startswith("|"):
        stripped_line = stripped_line[1:]
    if stripped_line.endswith("|"):
        stripped_line = stripped_line[:-1]
    return [cell.strip() for cell in stripped_line.split("|")]


def is_separator_row(cells):
    """Check whether the row is the Markdown alignment separator."""
    return bool(cells) and all(cell and set(cell) <= {":", "-"} for cell in cells)


def extract_year(time_text):
    """Pull a four-digit year from free-form time text."""
    match = re.search(r"(19|20)\d{2}", time_text)
    return int(match.group()) if match else None


def parse_distance(distance_text):
    """Parse the mileage cell, ignoring spaces and punctuation."""
    cleaned_text = distance_text.replace(",", "")
    match = re.search(r"\d+", cleaned_text)
    return int(match.group()) if match else 0


def parse_yearly_transport_stats(markdown_text, marker):
    """Aggregate yearly trip counts and distance from a Markdown table."""
    yearly_stats = defaultdict(lambda: {"count": 0, "distance": 0})
    current_time = ""

    for line in extract_table_lines(markdown_text, marker):
        cells = parse_markdown_row(line)
        if not cells or is_separator_row(cells) or cells[0] == "时间":
            continue

        time_text = cells[0]
        if time_text:
            current_time = time_text
        else:
            time_text = current_time

        year = extract_year(time_text)
        distance = parse_distance(cells[-1])
        if year is None or distance <= 0:
            continue

        yearly_stats[year]["count"] += 1
        yearly_stats[year]["distance"] += distance

    return dict(sorted(yearly_stats.items()))


def build_year_range(*stats_groups):
    """Use a continuous year range so empty years can show as zero."""
    all_years = [year for stats in stats_groups for year in stats]
    if not all_years:
        raise ValueError("没有解析到任何可统计的年份。")
    return list(range(min(all_years), max(all_years) + 1))


def build_series(stats, years):
    """Convert aggregated stats to aligned count/distance series."""
    counts = []
    distances = []

    for year in years:
        year_stats = stats.get(year, {"count": 0, "distance": 0})
        counts.append(year_stats["count"])
        distances.append(year_stats["distance"])

    return counts, distances


def draw_dual_axis_chart(
    years,
    counts,
    distances,
    title,
    output_name,
    *,
    count_color,
    count_fill,
    distance_color,
    distance_fill,
):
    """Draw a dual-axis line chart for yearly trip counts and mileage."""
    fig, ax_left = plt.subplots(figsize=CHART_FIGSIZE)
    fig.patch.set_facecolor(FIGURE_BACKGROUND)
    set_axis_style(ax_left)

    ax_right = ax_left.twinx()
    set_axis_style(ax_right, right_axis=True)
    ax_right.grid(False)

    x_values = list(range(len(years)))

    count_line, = ax_left.plot(
        x_values,
        counts,
        color=count_color,
        linewidth=LINE_WIDTH,
        marker="o",
        markersize=MARKER_SIZE,
        markerfacecolor="white",
        markeredgecolor=count_color,
        markeredgewidth=MARKER_EDGE_WIDTH,
        solid_capstyle="round",
        zorder=4,
    )
    ax_left.fill_between(x_values, counts, color=count_fill, alpha=0.24, zorder=1)

    distance_line, = ax_right.plot(
        x_values,
        distances,
        color=distance_color,
        linewidth=LINE_WIDTH,
        marker="D",
        markersize=MARKER_SIZE,
        markerfacecolor="white",
        markeredgecolor=distance_color,
        markeredgewidth=MARKER_EDGE_WIDTH,
        solid_capstyle="round",
        zorder=4,
    )
    ax_right.fill_between(x_values, distances, color=distance_fill, alpha=0.14, zorder=1)

    annotate_series(
        ax_left,
        x_values,
        counts,
        count_color,
        formatter=lambda value: f"{int(value)}",
        offset=-12,
        vertical_alignment="top",
        skip_zeros=True,
    )
    annotate_series(
        ax_right,
        x_values,
        distances,
        distance_color,
        formatter=lambda value: f"{int(value):,}",
        offset=12,
        vertical_alignment="bottom",
        skip_zeros=True,
    )

    ax_left.set_xticks(x_values)
    ax_left.set_xticklabels([str(year) for year in years])
    ax_left.set_xlim(-0.2, len(years) - 0.8)
    ax_left.set_ylim(lower_padding_from_zero(counts, 0.8), padded_upper_limit(counts))
    ax_right.set_ylim(lower_padding_from_zero(distances, 180), padded_upper_limit(distances))

    ax_left.set_ylabel("出行频次（次）", fontsize=AXIS_LABEL_FONT_SIZE, color=count_color)
    ax_right.set_ylabel("里程（km）", fontsize=AXIS_LABEL_FONT_SIZE, color=distance_color)
    ax_left.tick_params(axis="y", colors=count_color)
    ax_right.tick_params(axis="y", colors=distance_color)
    ax_left.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{int(value)}"))
    ax_right.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{int(value):,}"))
    ax_left.set_title(title, fontsize=TITLE_FONT_SIZE, fontweight="bold", pad=TITLE_PAD, color=TEXT_COLOR)

    legend = ax_left.legend(
        [count_line, distance_line],
        ["出行频次", "年度里程"],
        loc="upper left",
        frameon=True,
        fontsize=LEGEND_FONT_SIZE,
    )
    legend.get_frame().set_facecolor(AXIS_BACKGROUND)
    legend.get_frame().set_edgecolor("#E1D7C8")
    legend.get_frame().set_alpha(0.95)

    summary_text = f"总频次 {sum(counts)} 次\n总里程 {sum(distances):,} km"
    ax_left.text(
        0.985,
        0.055,
        summary_text,
        transform=ax_left.transAxes,
        ha="right",
        va="bottom",
        fontsize=SUMMARY_FONT_SIZE,
        color=SUBTLE_TEXT_COLOR,
        bbox=dict(boxstyle="round,pad=0.35", fc=AXIS_BACKGROUND, ec="#E1D7C8", alpha=0.95),
    )

    apply_figure_layout(fig)
    fig.savefig(BASE_DIR / output_name, facecolor=fig.get_facecolor())
    plt.close(fig)


def main():
    markdown_text = POST_PATH.read_text(encoding="utf-8")

    draw_area_chart(
        CITY_DATA["years"],
        CITY_DATA["new_cities"],
        "新到的城市数量",
        "城市数量",
        "new_cities.png",
        line_color="#2F7D95",
        fill_color="#9ED6D8",
        marker="o",
    )
    draw_area_chart(
        CITY_DATA["years"],
        CITY_DATA["cumulative_cities"],
        "累计去过的城市数量",
        "城市数量",
        "cumulative_cities.png",
        line_color="#C76A37",
        fill_color="#F3C38E",
        marker="D",
    )

    railway_stats = parse_yearly_transport_stats(markdown_text, "铁路记录如下")
    flight_stats = parse_yearly_transport_stats(markdown_text, "飞行记录如下")
    years = build_year_range(railway_stats, flight_stats)

    railway_counts, railway_distances = build_series(railway_stats, years)
    flight_counts, flight_distances = build_series(flight_stats, years)

    draw_dual_axis_chart(
        years,
        railway_counts,
        railway_distances,
        "每年铁路出行频次与里程",
        "railway_yearly_stats.png",
        count_color="#2A6F97",
        count_fill="#9CC9E3",
        distance_color="#C56B29",
        distance_fill="#F2BE8B",
    )
    draw_dual_axis_chart(
        years,
        flight_counts,
        flight_distances,
        "每年飞行频次与里程",
        "flight_yearly_stats.png",
        count_color="#1F8A70",
        count_fill="#8FD7C7",
        distance_color="#D05A4E",
        distance_fill="#F3A89D",
    )

    print("图表已重新生成：new_cities.png, cumulative_cities.png, railway_yearly_stats.png, flight_yearly_stats.png")


if __name__ == "__main__":
    main()
