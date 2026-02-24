<template>
  <div ref="pieChart" v-bind="$attrs" class="h-full w-full" />
</template>

<script setup lang="ts">
import { type ECOption, useEcharts } from "~/hooks";

interface DataItem {
  value: number;
  name: string;
  color?: string;
}

interface Props {
  title?: string;
  data?: DataItem[];
  chartData?: ECOption;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  data: () => [],
});

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === "dark");

const chartRef = ref<ECOption>() as Ref<ECOption>;
const { domRef: pieChart } = useEcharts(chartRef);

function renderChart() {
  const textColor = isDark.value ? "#9ca3af" : "#6b7280";

  // If we have direct data prop, use it to construct the chart options
  if (props.data && props.data.length > 0) {
    const seriesData = props.data.map((item) => ({
      value: item.value,
      name: item.name,
      itemStyle: item.color ? { color: item.color } : undefined,
    }));

    chartRef.value = {
      tooltip: {
        trigger: "item",
        backgroundColor: isDark.value ? "#1f2937" : "#ffffff",
        borderColor: isDark.value ? "#374151" : "#e5e7eb",
        textStyle: {
          color: textColor,
        },
      },
      legend: {
        top: "0%",
        left: "right",
        orient: "vertical",
        textStyle: {
          color: textColor,
        },
      },
      series: [
        {
          name: props.title || "Access From",
          type: "pie",
          radius: ["85%", "60%"],
          center: ["50%", "50%"],
          // startAngle: 180,
          // endAngle: 360,
          avoidLabelOverlap: false,
          label: {
            position: "center",
            formatter: "{d}%",
            fontSize: 24,
            fontFamily:
              "-apple-system, system ui, Segoe UI, Roboto, sans-serif",
            color: textColor,
          },
          labelLine: {
            show: false,
          },
          data: seriesData,
        },
      ],
    };
    return;
  }

  // Fallback to existing chartData prop logic if no data prop is provided
  if (props.chartData) {
    const chartData = { ...props.chartData };

    // Apply theme-aware text colors
    if (chartData.legend) {
      chartData.legend.textStyle = {
        color: textColor,
      };
    }

    if (chartData.tooltip) {
      chartData.tooltip = {
        ...chartData.tooltip,
        backgroundColor: isDark.value ? "#1f2937" : "#ffffff",
        borderColor: isDark.value ? "#374151" : "#e5e7eb",
        textStyle: {
          color: textColor,
        },
      };
    }

    // Update label colors in series
    if (chartData.series && Array.isArray(chartData.series)) {
      chartData.series = chartData.series.map((s: any) => {
        if (s.label) {
          return {
            ...s,
            label: {
              ...s.label,
              color: textColor,
            },
          };
        }
        return s;
      });
    }

    chartRef.value = chartData;
  }
}

watch(
  () => [props.data, props.chartData],
  () => {
    renderChart();
  },
  { deep: true },
);

watch(
  () => colorMode.value,
  () => {
    renderChart();
  },
);

onMounted(() => {
  renderChart();
});
</script>
