<template>
  <div ref="lineChart" v-bind="$attrs" class="h-full w-full" />
</template>

<script setup lang="ts">
import { type ECOption, useEcharts } from '~/hooks';
import { monthLists } from '~/lib';

interface Props {
  title?: string;
  xAxisData?: string[];
  series?: ECOption['series'];
}
const primaryColor = '#08d9a4';

const props = withDefaults(defineProps<Props>(), {
  title: '',
  xAxisData: () => [],
  series: () => [
    {
      name: '',
      type: 'bar',
      barWidth: '60%',
      itemStyle: {
        color: primaryColor,
        borderRadius: [10, 10, 0, 0],
      },
      data: [820, 932, 901, 934, 1290, 1330, 1450, 800, 879, 1209, 1500, 1690],
    },
  ],
});

const chartRef = ref<ECOption>() as Ref<ECOption>;
const { domRef: lineChart } = useEcharts(chartRef);

function renderChart() {
  chartRef.value = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
    },
    grid: {
      left: '2%',
      right: '4%',
      bottom: '0%',
      top: '20%',
      containLabel: true,
    },
    legend: {
      textStyle: {},
    },
    xAxis: [
      {
        type: 'category',
        axisLine: {
          lineStyle: {
            color: '#FCFCFC',
            cap: 'round',
            dashOffset: 5,
          },
        },
        axisLabel: {
          color: '#BDBBBB',
        },
        data: props.xAxisData.length
          ? props.xAxisData
          : monthLists.en.monthNamesShort,
      },
    ],
    yAxis: [
      {
        type: 'value',
        splitLine: {
          lineStyle: {
            color: '#FCFCFC',
          },
        },
        axisLine: {
          lineStyle: {
            color: '#FCFCFC',
            cap: 'round',
            dashOffset: 5,
          },
        },
        axisLabel: {
          color: '#BDBBBB',
        },
      },
    ],
    series: props.series,
  };
}

watch(
  () => props.series,
  () => {
    renderChart();
  }
);

onMounted(() => {
  renderChart();
});
</script>
