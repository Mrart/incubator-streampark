<!--
  Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements.  See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0
  (the "License"); you may not use this file except in compliance with
  the License.  You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<script lang="ts">
  export default {
    name: 'EditStreamPark',
  };
</script>
<script setup lang="ts" name="EditStreamPark">
  import { PageWrapper } from '/@/components/Page';
  import { BasicForm, useForm } from '/@/components/Form';
  import { onMounted, onBeforeUnmount, reactive, ref, nextTick, unref } from 'vue';
  import { AppListRecord } from '/@/api/flink/app/app.type';
  import configOptions from './data/option';
  import { fetchMain, fetchUpload, fetchUpdate, fetchGet } from '/@/api/flink/app/app';
  import { useRoute } from 'vue-router';
  import { getAppConfType, handleSubmitParams } from './utils';
  import { fetchFlinkHistory } from '/@/api/flink/app/flinkSql';
  import { decodeByBase64, encryptByBase64 } from '/@/utils/cipher';
  import PomTemplateTab from './components/PodTemplate/PomTemplateTab.vue';
  import UploadJobJar from './components/UploadJobJar.vue';
  import FlinkSqlEditor from './components/FlinkSql.vue';
  import Dependency from './components/Dependency.vue';
  import Different from './components/AppDetail/Different.vue';
  import Mergely from './components/Mergely.vue';
  import AppConf from './components/AppConf';
  import UseSysHadoopConf from './components/UseSysHadoopConf.vue';
  import CompareConf from './components/CompareConf';
  import { useMessage } from '/@/hooks/web/useMessage';
  import { fetchConfHistory } from '/@/api/flink/config';
  import { useDrawer } from '/@/components/Drawer';
  import { useEditStreamParkSchema } from './hooks/useEditStreamPark';
  import { useEdit } from './hooks/useEdit';
  import { useI18n } from '/@/hooks/web/useI18n';
  import { useGo } from '/@/hooks/web/usePage';
  import ProgramArgs from './components/ProgramArgs.vue';
  import VariableReview from './components/VariableReview.vue';
  import { ExecModeEnum, JobTypeEnum, UseStrategyEnum } from '/@/enums/flinkEnum';
  import AddAttrDrawer from './components/AddAttrDrawer.vue'
  import AddConfigDrawer from './components/AddConfigDrawer.vue'
  import SidebarMenu from './components/SidebarMenu.vue'

  const route = useRoute();
  const go = useGo();
  const { t } = useI18n();
  const { createMessage } = useMessage();
  const app = reactive<Partial<AppListRecord>>({});
  const flinkSqlHistory = ref<any[]>([]);
  const submitLoading = ref<boolean>(false);

  const configVersions = ref<Array<{ id: string }>>([]);

  const uploadLoading = ref(false);
  const uploadJar = ref('');
  const dependencyRef = ref();
  const programArgRef = ref();
  const podTemplateRef = ref();
  let initFormModel = reactive<Recordable>({})
  const isShow = ref(false)
  let isfailMsgActive = ref(false)
  let isAttrfailMsgActive = ref(false)
  const configForm = ref<InstanceType<typeof AddConfigDrawer> | null>(null);
  const attributeForm = ref<InstanceType<typeof AddAttrDrawer> | null>(null);
  const attrVisible = ref(false)
  const configVisible = ref(false)

  const k8sTemplate = reactive({
    podTemplate: '',
    jmPodTemplate: '',
    tmPodTemplate: '',
  });

  const { handleResetApplication, defaultOptions } = useEdit();
  const {
    alerts,
    flinkEnvs,
    flinkSql,
    getEditMainStreamParkFormSchema,
    getEditAttrStreamParkFormSchema,
    registerDifferentDrawer,
    suggestions,
  } = useEditStreamParkSchema(configVersions, flinkSqlHistory, dependencyRef);

  const [registerForm, { setFieldsValue, getFieldsValue, submit }] = useForm({
    labelWidth: 120,
    colon: true,
    baseColProps: { span: 24 },
    labelCol: { lg: { span: 5, offset: 0 }, sm: { span: 7, offset: 0 } },
    wrapperCol: { lg: { span: 16, offset: 0 }, sm: { span: 17, offset: 0 } },
    showActionButtonGroup: false,
  });

  const [registerConfDrawer, { openDrawer: openConfDrawer }] = useDrawer();
  const [registerReviewDrawer, { openDrawer: openReviewDrawer }] = useDrawer();
  const [registerDrawer, { openDrawer, closeDrawer }] = useDrawer();
  const [registerConfigureDrawer, { openDrawer: openConfigureDrawer, closeDrawer: closeConfigureDrawer }] = useDrawer();

  /* Form reset */
  function handleReset(executionMode?: string) {
    let selectAlertId = '';
    if (app.alertId) {
      selectAlertId = unref(alerts).filter((t) => t.id == app.alertId)[0]?.id;
    }
    nextTick(() => {
      const resetParams = handleResetApplication();
      const defaultParams = {
        jobName: app.jobName,
        tags: app.tags,
        args: app.args || '',
        description: app.description,
        dynamicProperties: app.dynamicProperties,
        resolveOrder: app.resolveOrder,
        versionId: app.versionId || null,
        k8sRestExposedType: app.k8sRestExposedType,
        yarnQueue: app.yarnQueue,
        restartSize: app.restartSize,
        alertId: selectAlertId,
        checkPointFailure: {
          cpMaxFailureInterval: app.cpMaxFailureInterval,
          cpFailureRateInterval: app.cpFailureRateInterval,
          cpFailureAction: app.cpFailureAction,
        },
        flinkImage: app.flinkImage,
        k8sNamespace: app.k8sNamespace,
        serviceAccount: app.serviceAccount || null,
        k8sTemplate: {
          podTemplate: app.k8sPodTemplate || '',
          jmPodTemplate: app.k8sJmPodTemplate || '',
          tmPodTemplate: app.k8sTmPodTemplate || '',
        },
        ...resetParams,
      };

      switch (app.executionMode) {
        case ExecModeEnum.STANDALONE:
          defaultParams['remoteClusterId'] = app.flinkClusterId;
          break;
        case ExecModeEnum.YARN_SESSION:
          defaultParams['yarnSessionClusterId'] = app.flinkClusterId;
          break;
        case ExecModeEnum.KUBERNETES_SESSION:
          defaultParams['k8sSessionClusterId'] = app.flinkClusterId;
          break;
        default:
          break;
      }

      if (!executionMode) {
        Object.assign(defaultParams, { executionMode: app.executionMode });
      }
      setFieldsValue(defaultParams);
      initFormModel = {...initFormModel, ...defaultParams}
      sessionStorage.setItem('AddJobModalParams', JSON.stringify(initFormModel))
      app.args && programArgRef.value?.setContent(app.args);
    });
  }
  /* Custom job upload */
  async function handleCustomJobRequest(data) {
    const formData = new FormData();
    formData.append('file', data.file);
    try {
      const path = await fetchUpload(formData);
      uploadJar.value = data.file.name;
      const res = await fetchMain({ jar: path });
      uploadLoading.value = false;
      setFieldsValue({ jar: uploadJar.value, mainClass: res });
    } catch (error) {
      console.error(error);
      uploadLoading.value = false;
    }
  }

  /* Handling update parameters */
  async function handleAppUpdate(values) {
    try {
      const drawerValues = sessionStorage.getItem('AddJobModalParams') || '{}';
      values = { ...JSON.parse(drawerValues), ...values}
      k8sTemplate.podTemplate = values.k8sTemplate?.podTemplate ?? ''
      k8sTemplate.jmPodTemplate = values.k8sTemplate?.jmPodTemplate ?? ''
      k8sTemplate.tmPodTemplate = values.k8sTemplate?.tmPodTemplate ?? ''
      // 判断属性抽屉表单是否验证
      // await attributeForm.value?.handleSubmit()
      // const attrvalus = attributeForm.value?.isSubmitConfig
      // if(!attrvalus) return 
      // isAttrfailMsgActive.value = false
      // // 判断配置抽屉表单是否验证
      // await configForm.value?.handleSubmit()
      // const configvalus = configForm.value?.isSubmitConfig
      // if(!configvalus) return 
      // isfailMsgActive.value = false
      submitLoading.value = true;
      if (app.jobType == JobTypeEnum.JAR) {
        handleSubmitCustomJob(values);
      } else {
        if (app.jobType == JobTypeEnum.SQL) {
          if (values.flinkSql == null || values.flinkSql.trim() === '') {
            createMessage.warning(t('flink.app.editStreamPark.flinkSqlRequired'));
          } else {
            const access = await flinkSql?.value?.handleVerifySql();
            if (!access) {
              createMessage.warning(t('flink.app.editStreamPark.sqlCheck'));
              throw new Error(access);
            }
            handleSubmitSQL(values);
          }
        }
      }
    } catch (error) {
      console.error(error);
      submitLoading.value = false;
    }
  }

  async function handleSubmitSQL(values: Recordable) {
    try {
      // Trigger a pom confirmation operation.
      let config = values.configOverride;
      if (config != null && config.trim() !== '') {
        config = encryptByBase64(config);
      } else {
        config = null;
      }
      const params = {
        id: app.id,
        sqlId: values.flinkSqlHistory || app.sqlId || null,
        flinkSql: values.flinkSql,
        config,
        format: values.isSetConfig ? 1 : null,
        dependency: values.dependency
      };
      handleSubmitParams(params, values, k8sTemplate);
      console.log("00w9e0w9e", values)
      await handleUpdateApp(params);
    } catch (error) {
      createMessage.error('edit error');
      submitLoading.value = false;
    }
  }
  /* Submit an update */
  async function handleSubmitCustomJob(values: Recordable) {
    try {
      const format =
        values.strategy == UseStrategyEnum.USE_EXIST
          ? app.format
          : getAppConfType(values.config || '');
      let config = values.configOverride || app.config;
      if (config != null && config.trim() !== '') {
        config = encryptByBase64(config);
      } else {
        config = null;
      }
      const configId = values.strategy == UseStrategyEnum.USE_EXIST ? app.configId : null;
      const params = {
        id: app.id,
        format: format,
        configId,
        config,
      };
      handleSubmitParams(params, values, k8sTemplate);
      handleUpdateApp(params);
    } catch (error) {
      console.error('error', error);
      submitLoading.value = false;
    }
  }

  /* Send submission interface */
  async function handleUpdateApp(params: Recordable) {
    try {
      const updated = await fetchUpdate(params);
      if (updated) {
        go('/flink/app');
      }
    } catch (error) {
      console.error('error', error);
    } finally {
      submitLoading.value = false;
    }
  }

  /* initialization information */
  async function handleStreamParkInfo() {
    const appId = route.query.appId;
    const res = await fetchGet({ id: appId as string });
    let configId = '';
    const confVersion = await fetchConfHistory({ id: route.query.appId });
    confVersion.forEach((conf: Recordable) => {
      if (conf.effective) {
        configId = conf.id;
      }
    });
    configVersions.value = confVersion;
    Object.assign(app, res);
    Object.assign(defaultOptions, JSON.parse(app.options || '{}'));
    if (app.jobType == JobTypeEnum.SQL) {
      fetchFlinkHistory({ id: appId }).then((res) => {
        flinkSqlHistory.value = res;
      });
    }
    let isSetConfig = false;
    let configOverride = '';
    if (app.config && app.config.trim() !== '') {
      configOverride = decodeByBase64(app.config);
      isSetConfig = true;
    }
    const defaultFormValue = { isSetConfig, configOverride };
    configOptions.forEach((item) => {
      Object.assign(defaultFormValue, {
        [item.key]: item.defaultValue,
      });
    });
    initFormModel = {
      ...res,
      flinkSql: res.flinkSql ? decodeByBase64(res.flinkSql) : '',
      configId,
      sqlId: app.sqlId,
      flinkSqlHistory: app.sqlId,
      versionId: app.versionId,
      projectName: app.projectName,
      project: app.projectId,
      configVersions:confVersion
    }
    isShow.value = true
    // const params = {...initFormModel, k8sTemplate}
    
    nextTick(() => {
      setFieldsValue({
        jobType: res.jobType,
        appType: res.appType,
        executionMode: res.executionMode,
        flinkSql: res.flinkSql ? decodeByBase64(res.flinkSql) : '',
        dependency: '',
        module: res.module,
        configId,
        sqlId: app.sqlId,
        flinkSqlHistory: app.sqlId,
        versionId: app.versionId,
        projectName: app.projectName,
        project: app.projectId,
        ...defaultFormValue,
      });
      unref(flinkSql)?.setContent(decodeByBase64(res.flinkSql));

      // setTimeout(() => {
      //   unref(dependencyRef)?.setDefaultValue(JSON.parse(res.dependency || '{}'));
      //   unref(podTemplateRef)?.handleChoicePodTemplate('ptVisual', res.k8sPodTemplate);
      //   unref(podTemplateRef)?.handleChoicePodTemplate('jmPtVisual', res.k8sJmPodTemplate);
      //   unref(podTemplateRef)?.handleChoicePodTemplate('tmPtVisual', res.k8sTmPodTemplate);
      // }, 1000);
    });
    handleReset();
  }

  function handleMergely(configOverride: string) {
    openConfDrawer(true, {
      configOverride,
    });
  }

  function handleEditConfClose() {
    const formValue = getFieldsValue();
    if (!formValue.configOverride) {
      setFieldsValue({ isSetConfig: false });
    }
  }

  async function handleEdit(type: string) {
    if(attrVisible.value) {
      await attributeForm.value?.handleSubmit()
    }
    if(configVisible.value) {
      await configForm.value?.handleSubmit()
    }
    const initFormData = JSON.parse(sessionStorage.getItem('AddJobModalParams')!)
    if (type === 'attr') {
      configVisible.value = false
      attrVisible.value = true
      closeConfigureDrawer()
<<<<<<< HEAD
=======
      console.log('initFormData', initFormData);
>>>>>>> 630649aa1 ([ui] add hzbank ui improve feature)
      openDrawer(true, initFormData);
    } else {
      attrVisible.value = false
      configVisible.value = true
      closeDrawer()
      openConfigureDrawer(true, initFormData);
    }
  }
  async function addConfigFailed(type: string) {
    if (type === 'config') {
      isfailMsgActive.value = true
    } else {
      isAttrfailMsgActive.value = true
    }
    configVisible.value = false
    attrVisible.value = false
  }
<<<<<<< HEAD
  async function addConfigsuccess() {
=======
  async function addConfigsuccess(type: string) {
    if (type === 'config') {
      isfailMsgActive.value = false
    } else {
      isAttrfailMsgActive.value = false
    }
>>>>>>> 630649aa1 ([ui] add hzbank ui improve feature)
    configVisible.value = false
    attrVisible.value = false
  }

  onMounted(() => {
    if (!route?.query?.appId) {
      go('/flink/app');
      createMessage.warning(t('flink.app.editStreamPark.appidCheck'));
      return;
    }
    handleStreamParkInfo();
  });
  onBeforeUnmount(() => {
    sessionStorage.removeItem('AddJobModalParams');
  })
</script>
<template>
  <div>
  <PageWrapper contentBackground content-class="p-26px app_controller app-content-margin-right">
    <BasicForm
      v-if="!!isShow"
      @register="registerForm"
      @submit="handleAppUpdate"
      :schemas="getEditMainStreamParkFormSchema"
      :initFormModel="initFormModel"
      :isAboutApp="true"
    >
      <template #podTemplate>
        <PomTemplateTab
          ref="podTemplateRef"
          v-model:podTemplate="k8sTemplate.podTemplate"
          v-model:jmPodTemplate="k8sTemplate.jmPodTemplate"
          v-model:tmPodTemplate="k8sTemplate.tmPodTemplate"
        />
      </template>
      <template #args="{ model }">
        <ProgramArgs
          ref="programArgRef"
          v-if="model.args != null"
          v-model:value="model.args"
          :suggestions="suggestions"
          @preview="(value) => openReviewDrawer(true, { value, suggestions })"
        />
      </template>
      <template #uploadJobJar>
        <UploadJobJar :custom-request="handleCustomJobRequest" v-model:loading="uploadLoading" />
      </template>
      <template #flinkSql="{ model, field }">
        <FlinkSqlEditor
          ref="flinkSql"
          v-model:value="model[field]"
          :versionId="model['versionId']"
          :suggestions="suggestions"
          @preview="(value) => openReviewDrawer(true, { value, suggestions })"
        />
      </template>
      <template #dependency="{ model, field }">
        <Dependency
          ref="dependencyRef"
          v-model:value="model[field]"
          :form-model="model"
          :flink-envs="flinkEnvs"
        />
      </template>
      <template #appConf="{ model }">
        <AppConf :model="model" :configVersions="configVersions" @open-mergely="handleMergely" />
      </template>
      <template #compareConf="{ model }">
        <CompareConf v-model:value="model.compareConf" :configVersions="configVersions" />
      </template>
      <template #useSysHadoopConf="{ model, field }">
        <UseSysHadoopConf v-model:hadoopConf="model[field]" />
      </template>

      <template #formFooter>
        <div class="flex items-center w-full justify-end">
          <a-button @click="go('/flink/app')">
            {{ t('common.cancelText') }}
          </a-button>
          <a-button class="ml-4" :loading="submitLoading" type="primary" @click="submit()">
            {{ t('common.submitText') }}
          </a-button>
        </div>
      </template>
    </BasicForm>
    <Mergely
      @ok="(data) => setFieldsValue(data)"
      @close="handleEditConfClose"
      @register="registerConfDrawer"
    />
    <Different @register="registerDifferentDrawer" />
    <VariableReview @register="registerReviewDrawer" />
    <SidebarMenu
      :isAttrfailMsgActive="isAttrfailMsgActive"
      :isfailMsgActive="isfailMsgActive"
      :attrVisible="attrVisible"
      :configVisible="configVisible"
      @openDrawer="handleEdit"
    />
  </PageWrapper>
  <AddAttrDrawer
    ref="attributeForm"
    :schema="getEditAttrStreamParkFormSchema"
    :flinkEnvs="flinkEnvs"
    @register="registerDrawer"
    @addAttrFailed="addConfigFailed"
    @addAttrsuccess="addConfigsuccess"
  />
  <AddConfigDrawer
    ref="configForm"
    @register="registerConfigureDrawer"
    @addConfigFailed="addConfigFailed"
    @addAttrsuccess="addConfigsuccess"
  />
</div>
</template>
<style lang="less">
  @import url('./styles/Add.less');
</style>
