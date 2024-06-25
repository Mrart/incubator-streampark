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
    name: 'AppCreate',
  };
</script>
<script setup lang="ts" name="AppCreate">
  import { useGo } from '/@/hooks/web/usePage';
  import ProgramArgs from './components/ProgramArgs.vue';
  import { Switch, Alert } from 'ant-design-vue';
  import { onMounted, onBeforeUnmount, reactive, ref, unref, nextTick } from 'vue';
  import { PageWrapper } from '/@/components/Page';
  import { createAsyncComponent } from '/@/utils/factory/createAsyncComponent';

  import { BasicForm, useForm } from '/@/components/Form';
  import { SettingTwoTone } from '@ant-design/icons-vue';
  import { useDrawer } from '/@/components/Drawer';
  import Mergely from './components/Mergely.vue';
  import { handleConfTemplate } from '/@/api/flink/config';
  import UploadJobJar from './components/UploadJobJar.vue';
  import { fetchAppConf, fetchCreate, fetchMain, fetchUpload } from '/@/api/flink/app/app';
  import options from './data/option';
  import { useCreateSchema } from './hooks/useCreateSchema';
  import { getAppConfType, handleSubmitParams } from './utils';
  import { useMessage } from '/@/hooks/web/useMessage';
  import { createLocalStorage } from '/@/utils/cache';
  import { buildUUID } from '/@/utils/uuid';
  import { useI18n } from '/@/hooks/web/useI18n';
  import { AppListRecord } from '/@/api/flink/app/app.type';
  import VariableReview from './components/VariableReview.vue';
  import PomTemplateTab from './components/PodTemplate/PomTemplateTab.vue';
  import UseSysHadoopConf from './components/UseSysHadoopConf.vue';
  import { CreateParams } from '/@/api/flink/app/app.type';
  import { decodeByBase64, encryptByBase64 } from '/@/utils/cipher';
  import AddAttrDrawer from './components/AddAttrDrawer.vue'
  import AddConfigDrawer from './components/AddConfigDrawer.vue'
  import SidebarMenu from './components/SidebarMenu.vue'
  import {
    AppTypeEnum,
    ClusterStateEnum,
    ExecModeEnum,
    JobTypeEnum,
    ResourceFromEnum,
  } from '/@/enums/flinkEnum';

  const FlinkSqlEditor = createAsyncComponent(() => import('./components/FlinkSql.vue'), {
    loading: true,
  });
  const Dependency = createAsyncComponent(() => import('./components/Dependency.vue'), {
    loading: true,
  });

  const go = useGo();
  const flinkSql = ref();
  const dependencyRef = ref();
  const uploadLoading = ref(false);
  const uploadJar = ref('');
  const submitLoading = ref(false);

  const { t } = useI18n();
  const { createMessage } = useMessage();
  const optionsKeyMapping = new Map();
  const ls = createLocalStorage();
  options.forEach((item) => {
    optionsKeyMapping.set(item.key, item);
  });

  const k8sTemplate = reactive({
    podTemplate: '',
    jmPodTemplate: '',
    tmPodTemplate: '',
  });
  const app = reactive<Partial<AppListRecord>>({});
  let initFormModel = reactive<Recordable>({});
  let checkedFromData = reactive<Recordable>({});
  const modalJobType = ref()
  const isShow = ref(false)
  let isfailMsgActive = ref(false)
  let isAttrfailMsgActive = ref(false)
  const configForm = ref<InstanceType<typeof AddConfigDrawer> | null>(null);
  const attributeForm = ref<InstanceType<typeof AddAttrDrawer> | null>(null);
  const { 
    flinkEnvs,
    flinkClusters, 
    getMainCreateFormSchema, 
    getCustomCreateFormSchema, 
    getAttrCreateFormSchema, 
    suggestions 
  } = useCreateSchema(dependencyRef, true);

  const [registerAppForm, { setFieldsValue, getFieldsValue, submit }] = useForm({
    labelCol: { lg: { span: 5, offset: 0 }, sm: { span: 7, offset: 0 } },
    wrapperCol: { lg: { span: 16, offset: 0 }, sm: { span: 17, offset: 0 } },
    baseColProps: { span: 24 },
    colon: true,
    showActionButtonGroup: false,
  });

  const [registerConfDrawer, { openDrawer: openConfDrawer }] = useDrawer();
  const [registerReviewDrawer, { openDrawer: openReviewDrawer }] = useDrawer();
  const [registerDrawer, { openDrawer, closeDrawer }] = useDrawer();
  const [registerConfigureDrawer, { openDrawer: openConfigureDrawer, closeDrawer: closeConfigureDrawer }] = useDrawer();

  const attrVisible = ref(false)
  const configVisible = ref(false)

  /* Initialize the form */
  async function handleInitForm() {
    const initFormData = JSON.parse(sessionStorage.getItem('AddJobModalParams') || '{}')
    modalJobType.value = initFormData.jobType
    isShow.value = true
    Object.assign(app, initFormData);
    const defaultValue = {
      resolveOrder: 0,
      k8sRestExposedType: 0,
    };
    options.forEach((item) => {
      defaultValue[item.key] = item.defaultValue;
    });
    const v = flinkEnvs.value.filter((v) => v.isDefault)[0];
    if (v) {
      Object.assign(defaultValue, { versionId: v.id });
    }
    initFormData.args = ""
    initFormModel = initFormData
    console.log("add", initFormModel)
    nextTick(() => {
      setFieldsValue({
        ...initFormData,
        ...defaultValue
      });
    })
  }

  /* Open the sqlConf drawer */
  async function handleSQLConf(checked: boolean, model: Recordable) {
    if (checked) {
      if (model.configOverride) {
        openConfDrawer(true, {
          configOverride: model.configOverride,
        });
      } else {
        const res = await handleConfTemplate();
        openConfDrawer(true, {
          configOverride: decodeByBase64(res),
        });
      }
    } else {
      openConfDrawer(false);
      setFieldsValue({ isSetConfig: false, configOverride: null });
    }
  }

  /* Custom job upload */
  async function handleCustomJobRequest(data) {
    const formData = new FormData();
    formData.append('file', data.file);
    try {
      const path = await fetchUpload(formData);
      uploadJar.value = data.file.name;
      const res = await fetchMain({
        jar: path,
      });
      uploadLoading.value = false;
      setFieldsValue({ mainClass: res });
    } catch (error) {
      console.error(error);
      uploadLoading.value = false;
    }
  }

  function handleEditConfClose() {
    const formValue = getFieldsValue();
    if (!formValue.configOverride) {
      setFieldsValue({ isSetConfig: false });
    }
  }

  function handleCluster(values: Recordable) {
    let flinkClusterId =
      values.executionMode == ExecModeEnum.YARN_SESSION
        ? values.yarnSessionClusterId
        : values.flinkClusterId;
    const cluster =
      unref(flinkClusters).filter((c) => {
        if (flinkClusterId) {
          return c.id == flinkClusterId && c.clusterState === ClusterStateEnum.STARTED;
        }
      })[0] || null;
    if (cluster) {
      Object.assign(values, { flinkClusterId: cluster.id });
    }
  }

  /* custom mode */
  async function handleSubmitCustomJob(values) {
    handleCluster(values);
    const params = {
      jobType: JobTypeEnum.JAR,
      projectId: values.project || null,
      module: values.module || null,
      appType: values.appType,
    };
    handleSubmitParams(params, values, k8sTemplate);
    // common params...
    const resourceFrom = values.resourceFrom;
    if (resourceFrom) {
      if (resourceFrom === 'cvs') {
        params['resourceFrom'] = ResourceFromEnum.CICD;
        //streampark flink
        if (values.appType == AppTypeEnum.STREAMPARK_FLINK) {
          const configVal = values.config;
          params['format'] = getAppConfType(configVal);
          if (values.configOverride == null) {
            params['config'] = await fetchAppConf({
              config: configVal,
            });
          } else {
            params['config'] = decodeByBase64(values.configOverride);
          }
        } else {
          params['jar'] = values.jar || null;
          params['mainClass'] = values.mainClass || null;
          params['dependency'] = values.dependency;
        }
        await handleCreateApp(params);
      } else {
        // from upload
        Object.assign(params, {
          resourceFrom: ResourceFromEnum.UPLOAD,
          appType: AppTypeEnum.APACHE_FLINK,
          jar: unref(uploadJar),
          mainClass: values.mainClass,
          dependency: values.dependency,
        });
        await handleCreateApp(params);
      }
    }
  }

  /* flink sql mode */
  async function handleSubmitSQL(values: Recordable) {
    let config = values.configOverride;
    if (config != null && config.trim() != '') {
      config = encryptByBase64(config);
    } else {
      config = null;
    }
    handleCluster(values);
    const params = {
      jobType: JobTypeEnum.SQL,
      flinkSql: values.flinkSql,
      appType: AppTypeEnum.STREAMPARK_FLINK,
      config,
      format: values.isSetConfig ? 1 : null,
      dependency: values.dependency,
    };
    delete values.options
    handleSubmitParams(params, values, k8sTemplate);
    handleCreateApp(params);
  }
  /* Submit to create */
  async function handleAppCreate(formValue: Recordable) {
    try {
      const values = JSON.parse(sessionStorage.getItem('AddJobModalParams') || '{}');
      const formModel = getFieldsValue();
      formValue = {...values, ...formValue, ...formModel, ...checkedFromData}
      console.log("handleAppCreate", formValue)
      // 判断属性抽屉表单是否验证
      await attributeForm.value?.checkFormValidation(formValue)
      const attrvalus = attributeForm.value?.isSubmitConfig
      if(!attrvalus) return 
      isAttrfailMsgActive.value = false
      // 判断配置抽屉表单是否验证
      await configForm.value?.checkFormValidation(formValue)
      const configvalus = configForm.value?.isSubmitConfig
      if(!configvalus) return 
      isfailMsgActive.value = false
      submitLoading.value = true;
      if (formValue.jobType === 'sql') {
        if (formValue.flinkSql == null || formValue.flinkSql.trim() === '') {
          createMessage.warning(t('flink.app.editStreamPark.flinkSqlRequired'));
        } else {
          const access = await flinkSql?.value?.handleVerifySql();
          if (!access) {
            createMessage.warning(t('flink.app.editStreamPark.sqlCheck'));
            throw new Error(access);
          }
        }
      }
      k8sTemplate.podTemplate = formValue.k8sTemplate?.podTemplate ?? ''
      k8sTemplate.jmPodTemplate = formValue.k8sTemplate?.jmPodTemplate ?? ''
      k8sTemplate.tmPodTemplate = formValue.k8sTemplate?.tmPodTemplate ?? ''
      if (formValue.jobType === 'customcode') {
        handleSubmitCustomJob(formValue);
      } else {
        handleSubmitSQL(formValue);
      }
    } catch (error) {
      submitLoading.value = false;
    }
  }
  /* send create request */
  async function handleCreateApp(params: Recordable) {
    const param = {};
    for (const k in params) {
      const v = params[k];
      if (v != null) {
        param[k] = v;
      }
    }
    const socketId = buildUUID();
    ls.set('DOWN_SOCKET_ID', socketId);
    Object.assign(param, { socketId });
    console.log("create", param)
    const { data } = await fetchCreate(param as CreateParams);
    submitLoading.value = false;
    if (data.data) {
      go('/flink/app');
    } else {
      createMessage.error(data.message);
    }
  }

  async function handleEdit(type: string) {
    if(attrVisible.value) {
      await attributeForm.value?.handleSubmit()
      if (isAttrfailMsgActive.value) return // 属性校验不通过禁止直接跳到配置
    }
    if(configVisible.value) {
      await configForm.value?.handleSubmit()
    }
    const sessionFormData = JSON.parse(sessionStorage.getItem('AddJobModalParams')!)
    const initFormData = getFieldsValue();
    
    let name = sessionFormData.jobName
    sessionStorage.setItem('AddJobModalParams', JSON.stringify({ ...initFormData,...sessionFormData}))
    const checkPointFailure = !!sessionFormData.checkPointFailure ? sessionFormData.checkPointFailure : {}
    if (type === 'attr') {
      configVisible.value = false
      attrVisible.value = true
      closeConfigureDrawer()
      openDrawer(true, {
        ...initFormData,
        ...sessionFormData, 
        jobName: name, 
        checkPointFailure: checkPointFailure
      });
    } else {
      attrVisible.value = false
      configVisible.value = true
      closeDrawer()
      openConfigureDrawer(true, sessionFormData);
    }
  }
  // 校验失败时执行
  async function addConfigFailed(data: string) {
    isAttrfailMsgActive.value = false
    isfailMsgActive.value = false
    if (data === 'config') {
      isfailMsgActive.value = true
    } else {
      isAttrfailMsgActive.value = true
    }
  }
  // 校验成功时执行
  function addAttrsuccess(type: string) {
    if (type === 'config') {
      isfailMsgActive.value = false
    } else {
      isAttrfailMsgActive.value = false
    }
    configVisible.value = false
    attrVisible.value = false
    const data = JSON.parse(sessionStorage.getItem('AddJobModalParams')!)
    const oldData = getFieldsValue()
    const params = {...oldData, ...data}
    setFieldsValue({...params})
    sessionStorage.setItem('AddJobModalParams', JSON.stringify(params)) // 成功后重新存储一遍数据
    checkedFromData = params
  }
  
  onMounted(async () => {
    handleInitForm();
  });
  onBeforeUnmount(() => {
    sessionStorage.removeItem('AddJobModalParams');
  })
</script>

<template>
  <div>
    <PageWrapper contentFullHeight contentBackground contentClass="p-26px app_controller app-content-margin-right">
      <BasicForm
        v-if="!!isShow"
        @register="registerAppForm"
        @submit="handleAppCreate"
        :schemas="modalJobType === 'sql' ? getMainCreateFormSchema : getCustomCreateFormSchema"
        :initFormModel="initFormModel"
        :isAboutApp="true"
      >
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
        <template #isSetConfig="{ model, field }">
          <Switch checked-children="ON" un-checked-children="OFF" v-model:checked="model[field]" />
          <SettingTwoTone
            v-if="model[field]"
            class="ml-10px"
            theme="twoTone"
            two-tone-color="#4a9ff5"
            @click="handleSQLConf(true, model)"
          />
        </template>
        <template #uploadJobJar>
          <UploadJobJar :custom-request="handleCustomJobRequest" v-model:loading="uploadLoading">
            <template #uploadInfo>
              <Alert v-if="uploadJar" class="uploadjar-box" type="info">
                <template #message>
                  <span class="tag-dependency-pom">
                    {{ uploadJar }}
                  </span>
                </template>
              </Alert>
            </template>
          </UploadJobJar>
        </template>
        <template #podTemplate>
          <PomTemplateTab
            v-model:podTemplate="k8sTemplate.podTemplate"
            v-model:jmPodTemplate="k8sTemplate.jmPodTemplate"
            v-model:tmPodTemplate="k8sTemplate.tmPodTemplate"
          />
        </template>
        <template #args="{ model }">
          <ProgramArgs
            v-model:value="model.args"
            :suggestions="suggestions"
            @preview="(value) => openReviewDrawer(true, { value, suggestions })"
          />
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
      :schema=getAttrCreateFormSchema
      :flinkEnvs="flinkEnvs"
      @register="registerDrawer"
      @addAttrFailed="addConfigFailed"
      @addAttrsuccess="addAttrsuccess"
    />
    <AddConfigDrawer
      ref="configForm"
      @register="registerConfigureDrawer" 
      @addConfigFailed="addConfigFailed"
      @addAttrsuccess="addAttrsuccess"
    />
</div>
</template>
<style lang="less">
  @import url('./styles/Add.less');
</style>
