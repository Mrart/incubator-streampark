/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { FormSchema } from '/@/components/Table';
import { computed, h, Ref, ref, unref } from 'vue';

import { useCreateAndEditSchema } from './useCreateAndEditSchema';
import { getAlertSvgIcon } from './useFlinkRender';
import { Alert } from 'ant-design-vue';
import { useRoute } from 'vue-router';
import { fetchMain } from '/@/api/flink/app/app';
import { ResourceFromEnum } from '/@/enums/flinkEnum';
import { useI18n } from '/@/hooks/web/useI18n';
import { JobTypeEnum } from '/@/enums/flinkEnum';
const { t } = useI18n();

export const useEditFlinkSchema = (jars: Ref) => {
  const flinkSql = ref();
  const route = useRoute();
  const {
    alerts,
    flinkEnvs,
    flinkClusters,
    getFlinkClusterSchemas,
    // getFlinkFormOtherSchemas,
    getFlinkNameDetailSchema,
    getFlinkFormAttrOtherSchemas,
    getFlinkFormConfigSchemas,
    getEditFormOtherSchemas,
    getFlinkTypeSchema,
    getExecutionModeSchema,
    suggestions,
  } = useCreateAndEditSchema(null, undefined, { appId: route.query.appId as string, mode: 'streampark' });

  const getEditFlinkFormSchema = computed((): FormSchema[] => {// 无用
    return [
      ...getFlinkTypeSchema.value,
      ...getExecutionModeSchema.value,
      {
        field: 'resourceFrom',
        label: 'Resource From',
        component: 'Input',
        render: ({ model }) => {
          if (model.resourceFrom == ResourceFromEnum.CICD)
            return getAlertSvgIcon('github', 'CICD (build from CSV)');
          else if (model.resourceFrom == ResourceFromEnum.UPLOAD)
            return getAlertSvgIcon('upload', 'Upload (upload local job)');
          else return '';
        },
      },
      ...getFlinkClusterSchemas.value,
      {
        field: 'projectName',
        label: 'Project',
        component: 'Input',
        render: ({ model }) => h(Alert, { message: model.projectName, type: 'info' }),
        ifShow: ({ model }) => model.resourceFrom == ResourceFromEnum.CICD && model.projectName,
      },
      {
        field: 'module',
        label: 'Module',
        component: 'Input',
        render: ({ model }) => h(Alert, { message: model.module, type: 'info' }),
        ifShow: ({ model }) => model.resourceFrom == ResourceFromEnum.CICD && model.module,
      },
      {
        field: 'jar',
        label: 'Program Jar',
        component: 'Select',
        componentProps: ({ formModel }) => {
          return {
            placeholder: 'Please select jar',
            options: unref(jars).map((i) => ({ label: i, value: i })),
            onChange: (value: string) => {
              fetchMain({
                projectId: formModel.projectId,
                module: formModel.module,
                jar: value,
              }).then((res) => {
                formModel.mainClass = res;
              });
            },
          };
        },
        ifShow: ({ model }) => model.resourceFrom == ResourceFromEnum.CICD,
        rules: [{ required: true, message: 'Please select jar' }],
      },
      {
        field: 'uploadJobJar',
        label: 'Upload Job Jar',
        component: 'Select',
        slot: 'uploadJobJar',
        ifShow: ({ model }) => model.resourceFrom != ResourceFromEnum.CICD,
      },
      {
        field: 'jar',
        label: 'Program Jar',
        component: 'Input',
        dynamicDisabled: true,
        ifShow: ({ model }) => model.resourceFrom !== ResourceFromEnum.CICD
      },
      {
        field: 'mainClass',
        label: 'Program Main',
        component: 'Input',
        componentProps: {
          allowClear: true,
          placeholder: 'Please enter Main class',
        },
        rules: [{ required: true, message: 'Program Main is required' }],
      },
      {
        field: 'dependency',
        label: t('flink.app.dependency'),
        component: 'Input',
        slot: 'dependency',
      },
      // ...getFlinkFormOtherSchemas.value,
    ];
  });

  // 主页
  const getEditMainFlinkFormSchema = computed((): FormSchema[] => {
    return [
      {
        field: 'resourceFrom',
        label: 'Resource From',
        component: 'Input',
        render: ({ model }) => {
          if (model.resourceFrom == ResourceFromEnum.CICD)
            return getAlertSvgIcon('github', 'CICD (build from CSV)');
          else if (model.resourceFrom == ResourceFromEnum.UPLOAD)
            return getAlertSvgIcon('upload', 'Upload (upload local job)');
          else return '';
        },
      },
      {
        field: 'projectName',
        label: 'Project',
        component: 'Input',
        render: ({ model }) => h(Alert, { message: model.projectName, type: 'info' }),
        ifShow: ({ model }) => model.resourceFrom == ResourceFromEnum.CICD && model.projectName,
      },
      {
        field: 'module',
        label: 'Module',
        component: 'Input',
        render: ({ model }) => h(Alert, { message: model.module, type: 'info' }),
        ifShow: ({ model }) => model.resourceFrom == ResourceFromEnum.CICD && model.module,
      },
      {
        field: 'jar',
        label: 'Program Jar',
        component: 'Select',
        componentProps: ({ formModel }) => {
          return {
            placeholder: 'Please select jar',
            options: unref(jars).map((i) => ({ label: i, value: i })),
            onChange: (value: string) => {
              fetchMain({
                projectId: formModel.projectId,
                module: formModel.module,
                jar: value,
              }).then((res) => {
                formModel.mainClass = res;
              });
            },
          };
        },
        ifShow: ({ model }) => model.resourceFrom == ResourceFromEnum.CICD,
        rules: [{ required: true, message: 'Please select jar' }],
      },
      {
        field: 'uploadJobJar',
        label: 'Upload Job Jar',
        component: 'Select',
        slot: 'uploadJobJar',
        ifShow: ({ model }) => model.resourceFrom != ResourceFromEnum.CICD,
      },
      {
        field: 'jar',
        label: 'Program Jar',
        component: 'Input',
        dynamicDisabled: true,
        ifShow: ({ model }) => model.resourceFrom !== ResourceFromEnum.CICD
      },
      {
        field: 'mainClass',
        label: 'Program Main',
        component: 'Input',
        componentProps: {
          allowClear: true,
          placeholder: 'Please enter Main class',
        },
        rules: [{ required: true, message: 'Program Main is required' }],
      },
      {
        field: 'args',
        label: t('flink.app.programArgs'),
        component: 'InputTextArea',
        defaultValue: '',
        slot: 'args',
        ifShow: ({values}) => {
          return values.jobType == JobTypeEnum.JAR
        },
      },
    ]
  })
  // 属性
  const getEditAttrFlinkFormSchema = computed((): FormSchema[] => {
    return [
      ...getFlinkTypeSchema.value,
      ...getExecutionModeSchema.value,
      ...getFlinkClusterSchemas.value,
      ...getFlinkNameDetailSchema.value, // 作业名称 + 描述
      ...getFlinkFormAttrOtherSchemas.value, // (失败后)重启次数 + 告警模板 + checkPoint失败策略
      {
        field: 'dependency',
        label: t('flink.app.dependency'),
        component: 'Input',
        slot: 'dependency',
      },
      ...getEditFormOtherSchemas.value
    ]
  })
  // 配置
  const getEditConfigFlinkFormSchema = computed((): FormSchema[] => {
    return [...getFlinkFormConfigSchemas.value]
  })
  return {
    getEditFlinkFormSchema,
    getEditMainFlinkFormSchema,
    getEditAttrFlinkFormSchema,
    getEditConfigFlinkFormSchema,
    flinkEnvs,
    flinkClusters,
    flinkSql,
    alerts,
    suggestions,
  };
};
