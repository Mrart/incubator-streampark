package org.apache.streampark.console.core.service.alert.impl;

import org.apache.streampark.console.base.exception.AlertException;
import org.apache.streampark.console.core.bean.AlertConfigWithParams;
import org.apache.streampark.console.core.bean.AlertHttpCallbackParams;
import org.apache.streampark.console.core.bean.AlertTemplate;
import org.apache.streampark.console.core.service.alert.AlertNotifyService;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hzbank.mqsdk.ProxyHost;
import com.hzbank.mqsdk.model.Httpheader;
import com.hzbank.mqsdk.util.ParamUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Random;

@Slf4j
@Service
@Lazy
public class AlertHzbankSendMessageImpl implements AlertNotifyService {

  @Autowired private ObjectMapper mapper;

  @Value("${com.hzbank.source}")
  private String source;

  @Value("${com.hzbank.topic}")
  private String topic;

  @Value("${com.hzbank.transcode}")
  private String transcode;

  @Value("${com.hzbank.bsntype}")
  private String bsntype;

  @Value("${com.hzbank.server}")
  private String server;

  @Value("${com.hzbank.channel}")
  private String channel;

  public boolean sendMsg(String phonumber, String body) {

    // TODO 创建短信服务连接
    boolean messageFlag = true;
    ProxyHost proxyHost = new ProxyHost();

    Httpheader head = new Httpheader();

    SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd");
    String format = sdf.format(new Date());

    head.setTopic(topic);
    // TODO 使用系统+ 当前日期 +随机七位数
    head.setKeys(source + format + new Random().nextInt(10000000));
    // TODO http请求体

    JSONObject httpBody = new JSONObject();
    // TODO 自定义消息头
    JSONObject reqHead = new JSONObject();
    reqHead.put("version", "3.0");
    reqHead.put("source", source);
    reqHead.put("sourceName", "实时数仓告警");
    reqHead.put("transCode", transcode);
    reqHead.put("bsnType", bsntype);
    reqHead.put("msgcount", 1);

    httpBody.put("reqHead", reqHead);
    JSONArray reqBody = new JSONArray();
    JSONObject jsonEle = new JSONObject();
    // TODO 发送渠道100000000 单短信告警
    jsonEle.put("bsnMsgId", source + format + (10000000 + new Random().nextInt(90000000)));
    jsonEle.put("openChannel", channel);
    jsonEle.put("mobile", phonumber);
    jsonEle.put("sendType", "0");
    jsonEle.put("smsContent", body);
    reqBody.add(jsonEle);
    httpBody.put("reqBody", reqBody);
    try {

      proxyHost.setServers(server);

      String resultJson = proxyHost.nsproxySend(httpBody, head);

      if (ParamUtil.SUCCESS.equals(resultJson)) { //
        log.info("Send message success!");
      } else {
        log.error("Send message failed!phone number is {}, body is {}", phonumber, body);
        messageFlag = false;
      }

    } catch (Exception e) {
      log.error("send message failed.", e);
      messageFlag = false;
    }

    return messageFlag;
  }

  @Override
  public boolean doAlert(AlertConfigWithParams alertConfig, AlertTemplate alertTemplate)
      throws AlertException {
    AlertHttpCallbackParams alertHttpCallbackParams = alertConfig.getHttpCallbackParams();

    String phonumber = alertHttpCallbackParams.getPhonumber();

    if (!StringUtils.hasLength(phonumber)) {
      log.error("Send message failed.Because phone number is null!");
      return false;
    }
    try {
      String body =
          String.format(
              "flink job alarm \n current job name: %s, current job status %s, alarm time: %s-%s.",
              alertTemplate.getJobName(),
              alertTemplate.getStatus(),
              alertTemplate.getStartTime(),
              alertTemplate.getEndTime());
      return sendMsg(phonumber, body);
    } catch (AlertException alertException) {
      log.error("send", alertException);
      throw alertException;
    } catch (Exception e) {
      log.error("Failed send httpCallback", e);
      throw new AlertException("Failed send httpCallback alert", e);
    }
  }
}
