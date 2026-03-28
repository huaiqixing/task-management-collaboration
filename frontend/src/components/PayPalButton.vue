<script setup>
import { ref } from 'vue'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'

const props = defineProps({
  planId: {
    type: String,
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['success', 'error'])

const createOrder = (data, actions) => {
  // For sandbox testing - create order on client side
  // In production, this should call your backend to create the order
  return actions.order.create({
    intent: 'CAPTURE',
    purchase_units: [{
      description: props.planName,
      amount: {
        currency_code: 'USD',
        value: props.amount
      }
    }]
  })
}

const onApprove = (data, actions) => {
  return actions.order.capture().then(details => {
    emit('success', {
      orderID: data.orderID,
      details: details,
      planId: props.planId
    })
  })
}

const onError = (err) => {
  emit('error', err)
}
</script>

<template>
  <div class="paypal-button-wrapper">
    <PayPalButtons
      :style="{
        layout: 'vertical',
        shape: 'rect',
        color: 'gold',
        label: 'paypal'
      }"
      :create-order="createOrder"
      :on-approve="onApprove"
      :on-error="onError"
    />
  </div>
</template>

<style scoped>
.paypal-button-wrapper {
  width: 100%;
  margin-top: 16px;
}
</style>
