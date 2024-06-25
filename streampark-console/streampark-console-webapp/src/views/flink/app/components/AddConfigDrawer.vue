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
<template>
  <BasicDrawer
    class="app_controller app-drawer-margin"
    :showCancelBtn="false"
    :okText="t('common.closeText')"
    closeType="changeCloseHandlen"
    @register="registerDrawer"
    showFooter
    width="50%"
    @ok="handleSubmit"
    @close="handleSubmit"
  >
    <template #title>
      <Icon icon="ant-design:user-add-outlined" />
      {{ getTitle }}
    </template>
    <BasicForm ref="form" @register="registerForm" :schemas="getConfigFormSchema">
    </BasicForm>
  </BasicDrawer>
</template>
<script lang="ts">
  import { computed, defineComponent, ref, unref, reactive } from 'vue';
  import { BasicForm, useForm } from '/@/components/Form';
  // import { formSchema } from '../user.data';
  import { FormTypeEnum } from '/@/enums/formEnum';
  
  import { BasicDrawer, useDrawerInner } from '/@/components/Drawer';
  import { useCreateSchema } from '../hooks/useCreateSchema';
  import { handleFormValue } from '../utils';
  // import { addUser, updateUser } from '/@/api/system/user';
  import { useEdit } from '../hooks/useEdit';
  import Icon from '/@/components/Icon';
  import { useI18n } from '/@/hooks/web/useI18n';
  import { AppListRecord } from '/@/api/flink/app/app.type';
  import { useMessage } from '/@/hooks/web/useMessage';

  export default defineComponent({
    name: 'MenuDrawer',
    components: { BasicDrawer, Icon, BasicForm },
    emits: ['addAttrsuccess', 'register', 'addConfigFailed'],
    setup(_, {emit}) {
      const { t } = useI18n();
      const formType = ref(FormTypeEnum.Edit);
      const dependencyRef = ref();
      const app = reactive<Partial<AppListRecord>>({}); // 属性提交的参数
      let oldSessionData = reactive<Partial<AppListRecord>>({});
      const { createMessage } = useMessage();
      const { handleResetApplication, memoryItems } = useEdit();

<<<<<<< HEAD
      const [registerForm, { resetFields, setFieldsValue, getFieldsValue, clearValidate, validateFields }] = useForm({
=======
      const [registerForm, { setFieldsValue, getFieldsValue, clearValidate, validateFields }] = useForm({
>>>>>>> 630649aa1 ([ui] add hzbank ui improve feature)
        name: 'MemberForm',
        colon: true,
        showActionButtonGroup: false,
        baseColProps: { span: 24 },
        labelCol: { lg: { span: 5, offset: 0 }, sm: { span: 7, offset: 0 } },
        wrapperCol: { lg: { span: 16, offset: 0 }, sm: { span: 17, offset: 0 } },
      });

      const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data) => {
        // formType.value = data.formType;
        console.log("addCofigDrawer", data)
<<<<<<< HEAD
        resetFields();
=======
>>>>>>> 630649aa1 ([ui] add hzbank ui improve feature)
        clearValidate();
        // updateSchema(formSchema(unref(formType)));
        setDrawerProps({
          confirmLoading: false
        });
        const resetValues = {
          dynamicProperties: data.dynamicProperties,
          parallelism: data.parallelism,
          resolveOrder: data.resolveOrder,
          slot: data.slot,
          tags: data.tags,
          options: data.options
        }
        oldSessionData = data
        Object.assign(app, resetValues);
        memoryItems.totalItems = []
        memoryItems.jmMemoryItems = []
        memoryItems.tmMemoryItems = []
        const resetOption = handleResetApplication(resetValues)
        setFieldsValue({...resetValues, ...resetOption})
        // setFieldsValue({...data, ...resetOption});
        console.log("addCofigDrawer", resetOption)
        
        // app.options
        // if (unref(formType) !== FormTypeEnum.Create) {
        //   const roleIds = data.record?.roleId ?? [];
        //   data.record.roleId = Array.isArray(roleIds) ? roleIds : roleIds.split(',');
        //   setFieldsValue(data);
        // }
      });
      const { getConfigFormSchema } = useCreateSchema(dependencyRef, true);

      const getTitle = computed(() => {
        return {
          // [FormTypeEnum.Create]: t('system.user.form.create'),
          [FormTypeEnum.Edit]: t('flink.app.addDrawerMenu.editConfig'),
          // [FormTypeEnum.View]: t('system.user.form.view'),
        }[unref(formType)];
      });
      let isSubmitConfig = ref(false)
      async function handleSubmit() {
        try {
          const values = await validateFields();
          console.log("1", values)
          // const values = formValidate()
          setDrawerProps({ confirmLoading: true });
          // const oldValues = JSON.parse(sessionStorage.getItem('AddJobModalParams') || '{}');
          const options = handleFormValue({...oldSessionData, ...values}) // 把所选内存整合成一个options对象
          // const resetOption = handleResetApplication({...values, options}) // 把options对象拆解成form表单所需字段
          console.log(oldSessionData)
          const params = handleConfigSubmitParams(oldSessionData,values)
          // const params = {...oldSessionData, ...values, options: JSON.stringify(options)}
          console.log("cofigSUmit", params)
          sessionStorage.setItem('AddJobModalParams', JSON.stringify({...params, options: JSON.stringify(options)}));
          isSubmitConfig.value = true
          closeDrawer();
          emit('addAttrsuccess', 'config');
        } catch (e) {
          createMessage.warning(t('flink.app.addDrawerMenu.configValidateTips'))
          isSubmitConfig.value = false
          emit('addConfigFailed', {type: 'config'});
        } finally {
          setDrawerProps({ confirmLoading: false });
        }
      }
      function handleConfigSubmitParams(data, values) {
        const newValues = {}
        for (const k in values) {
          if ((k.startsWith('jobmanager_memory_')) && (values[k] === undefined || values[k] === null)) {
          
          } else if ((k.startsWith('taskmanager_memory_')) && (values[k] === undefined || values[k] === null)) {
            
          } else {
            newValues[k] = values[k]
          }
        }
        const a = {...data, ...newValues}
        return a
      }
      async function handleClose() {
        const values = getFieldsValue()
        const oldValues = JSON.parse(sessionStorage.getItem('AddJobModalParams') || '{}');
        const params = { ...oldValues, ...values}
        sessionStorage.setItem('AddJobModalParams', JSON.stringify(params))
      }
      // 自定义验证form表单
      const checkFormValidation = (formData: Recordable) => {
        isSubmitConfig.value = true
        if (!formData.hasOwnProperty('resolveOrder') || formData.resolveOrder == undefined || formData.resolveOrder == null) {
          isSubmitConfig.value = false
          emit('addConfigFailed', 'config');
        }
      }
      return { 
        t, 
        registerDrawer, 
        registerForm, 
        getTitle, 
        getConfigFormSchema, 
        handleSubmit, 
        isSubmitConfig, 
        checkFormValidation, 
        handleClose 
      };
    },
  });
</script>
<style lang="less">
  @import url('../styles/Add.less');
</style>
  