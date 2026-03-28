<script setup>
import { ref, computed, onMounted } from 'vue'

const billingCycle = ref('monthly')
const showPaymentModal = ref(false)
const selectedPlan = ref(null)
const paypalLoaded = ref(false)
const paypalError = ref(false)

const plans = [
  {
    id: 'free',
    name: '免费版',
    icon: '🆓',
    price: '0',
    period: '永久',
    description: '适合个人轻度使用',
    features: [
      { text: '任务增删改查', included: true },
      { text: '子任务支持', included: true },
      { text: '优先级/标签', included: true },
      { text: '搜索过滤排序', included: true },
      { text: '数据导入导出', included: true },
      { text: '明暗主题', included: true },
      { text: '云端同步（多设备）', included: false },
      { text: '高级统计看板', included: false },
      { text: '任务提醒通知', included: false },
    ],
    highlighted: false,
    buttonText: '当前方案',
    buttonStyle: 'outline'
  },
  {
    id: 'pro',
    name: 'Pro 个人版',
    icon: '⭐',
    price: '29',
    period: '/月',
    yearlyPrice: '199',
    yearlyPeriod: '/年',
    description: '适合重度个人用户',
    usdPrice: '4.00',
    usdYearlyPrice: '27.00',
    features: [
      { text: '免费版全部功能', included: true },
      { text: '云端同步（多设备）', included: true },
      { text: '高级统计看板', included: true },
      { text: '自定义标签颜色', included: true },
      { text: '任务提醒通知', included: true },
      { text: '无限子任务', included: true },
      { text: '数据备份恢复', included: true },
      { text: '优先客服支持', included: true },
      { text: '团队协作功能', included: false },
    ],
    highlighted: true,
    badge: '推荐',
    buttonText: '立即升级',
    buttonStyle: 'primary'
  },
  {
    id: 'team',
    name: '团队版',
    icon: '👥',
    price: '99',
    period: '/月/团队',
    description: '适合团队协作使用',
    usdPrice: '14.00',
    features: [
      { text: 'Pro 全部功能', included: true },
      { text: '团队任务管理', included: true },
      { text: '成员协作', included: true },
      { text: '任务分配', included: true },
      { text: '团队统计', included: true },
      { text: '权限管理', included: true },
      { text: '专属技术支持', included: true },
      { text: 'API 接入', included: true },
      { text: '自定义域名', included: true },
    ],
    highlighted: false,
    buttonText: '咨询详情',
    buttonStyle: 'outline'
  }
]

const getPrice = (plan) => {
  if (plan.id === 'free') return plan.price
  if (billingCycle.value === 'yearly' && plan.yearlyPrice) {
    return plan.yearlyPrice
  }
  return plan.price
}

const getUSDPrice = (plan) => {
  if (plan.id === 'free') return '0'
  if (billingCycle.value === 'yearly' && plan.usdYearlyPrice) {
    return plan.usdYearlyPrice
  }
  return plan.usdPrice || '0'
}

const getPeriod = (plan) => {
  if (plan.id === 'free') return plan.period
  if (billingCycle.value === 'yearly' && plan.yearlyPeriod) {
    return plan.yearlyPeriod
  }
  return plan.period
}

const getSavings = (plan) => {
  if (!plan.yearlyPrice) return null
  const monthlyTotal = parseInt(plan.price) * 12
  const yearlyTotal = parseInt(plan.yearlyPrice)
  const savings = monthlyTotal - yearlyTotal
  return savings
}

const getPlanName = (plan) => {
  const cycle = billingCycle.value === 'yearly' ? '年付' : '月付'
  return `${plan.name} - ${cycle}`
}

const openPaymentModal = (plan) => {
  if (plan.id === 'free') {
    alert('您正在使用免费版本')
    return
  }
  if (plan.id === 'team') {
    alert('团队版定制服务，请联系客服了解详情。')
    return
  }
  selectedPlan.value = plan
  showPaymentModal.value = true
  
  // 等待 DOM 更新后初始化 PayPal
  setTimeout(initPayPalButton, 100)
}

const closePaymentModal = () => {
  showPaymentModal.value = false
  selectedPlan.value = null
}

const handlePaymentSuccess = (data) => {
  console.log('Payment successful:', data)
  alert(`🎉 支付成功！\n\n订单ID: ${data.orderID}\n方案: ${selectedPlan.value?.name}\n\n您的升级将在系统中生效。`)
  closePaymentModal()
}

const handlePaymentError = (err) => {
  console.error('Payment error:', err)
  alert('支付过程中出现错误，请稍后重试。')
}

let paypalScript = null

const initPayPalButton = () => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb'
  
  // 如果已经加载过了，不要重复加载
  if (window.paypal) {
    renderPayPalButtons()
    return
  }
  
  // 移除旧的 script
  const existingScript = document.getElementById('paypal-sdk')
  if (existingScript) {
    existingScript.remove()
  }
  
  // 加载 PayPal SDK
  paypalScript = document.createElement('script')
  paypalScript.id = 'paypal-sdk'
  paypalScript.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`
  paypalScript.async = true
  
  paypalScript.onload = () => {
    paypalLoaded.value = true
    renderPayPalButtons()
  }
  
  paypalScript.onerror = () => {
    console.error('Failed to load PayPal SDK')
    paypalError.value = true
  }
  
  document.head.appendChild(paypalScript)
}

const renderPayPalButtons = () => {
  if (!window.paypal || !selectedPlan.value) return
  
  const container = document.getElementById('paypal-button-container')
  if (!container) return
  
  // 清空容器
  container.innerHTML = ''
  
  const amount = getUSDPrice(selectedPlan.value)
  
  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      shape: 'rect',
      color: 'gold',
      label: 'paypal'
    },
    createOrder: (data, actions) => {
      return actions.order.create({
        intent: 'CAPTURE',
        purchase_units: [{
          description: getPlanName(selectedPlan.value),
          amount: {
            currency_code: 'USD',
            value: amount
          }
        }]
      })
    },
    onApprove: (data, actions) => {
      return actions.order.capture().then(details => {
        handlePaymentSuccess({
          orderID: data.orderID,
          details: details
        })
      })
    },
    onError: (err) => {
      handlePaymentError(err)
    }
  }).render('#paypal-button-container')
}

// 监听弹窗关闭，清理 PayPal
const onModalClose = () => {
  const container = document.getElementById('paypal-button-container')
  if (container) {
    container.innerHTML = ''
  }
}
</script>

<template>
  <div class="pricing-page">
    <div class="pricing-header">
      <h1>💎 选择您的方案</h1>
      <p>简单透明的定价，让团队效率最大化</p>
      
      <div class="billing-toggle">
        <button 
          :class="{ active: billingCycle === 'monthly' }"
          @click="billingCycle = 'monthly'"
        >
          月付
        </button>
        <button 
          :class="{ active: billingCycle === 'yearly' }"
          @click="billingCycle = 'yearly'"
        >
          年付 <span class="discount-badge">省 2 个月</span>
        </button>
      </div>
    </div>

    <div class="pricing-grid">
      <div 
        v-for="plan in plans" 
        :key="plan.id"
        class="pricing-card"
        :class="{ highlighted: plan.highlighted }"
      >
        <div v-if="plan.badge" class="plan-badge">{{ plan.badge }}</div>
        
        <div class="plan-icon">{{ plan.icon }}</div>
        <h3 class="plan-name">{{ plan.name }}</h3>
        <p class="plan-desc">{{ plan.description }}</p>
        
        <div class="plan-price">
          <span class="currency">¥</span>
          <span class="amount">{{ getPrice(plan) }}</span>
          <span class="period">{{ getPeriod(plan) }}</span>
        </div>
        
        <div v-if="getSavings(plan)" class="savings-note">
          相当于免费用 {{ Math.round(getSavings(plan) / 29) }} 个月
        </div>

        <ul class="feature-list">
          <li 
            v-for="feature in plan.features" 
            :key="feature.text"
            :class="{ disabled: !feature.included }"
          >
            <span class="feature-icon">{{ feature.included ? '✅' : '❌' }}</span>
            {{ feature.text }}
          </li>
        </ul>

        <button 
          class="plan-button"
          :class="plan.buttonStyle"
          @click="openPaymentModal(plan)"
        >
          {{ plan.buttonText }}
        </button>
      </div>
    </div>

    <div class="pricing-footer">
      <div class="trust-badges">
        <span>🔒 支付安全</span>
        <span>💰 随时退款</span>
        <span>💳 PayPal 支付</span>
      </div>
      <p class="footer-note">所有方案均包含 14 天无条件退款保障</p>
    </div>
  </div>

  <!-- Payment Modal -->
  <div v-if="showPaymentModal" class="payment-modal-overlay" @click.self="closePaymentModal">
    <div class="payment-modal" @click.stop>
      <div class="modal-header">
        <h2>💳 完成支付</h2>
        <button class="close-btn" @click="closePaymentModal">×</button>
      </div>
      
      <div class="modal-body" v-if="selectedPlan">
        <div class="order-summary">
          <h3>订单摘要</h3>
          <div class="order-row">
            <span>方案</span>
            <span>{{ selectedPlan.name }}</span>
          </div>
          <div class="order-row">
            <span>周期</span>
            <span>{{ billingCycle === 'yearly' ? '年付' : '月付' }}</span>
          </div>
          <div class="order-row total">
            <span>金额</span>
            <span>¥{{ getPrice(selectedPlan) }}</span>
          </div>
          <div class="order-row usd-note">
            <span>PayPal 将以 USD 结算</span>
            <span>≈ ${{ getUSDPrice(selectedPlan) }}</span>
          </div>
        </div>

        <div class="paypal-section">
          <h3>选择支付方式</h3>
          <div v-if="paypalError" class="paypal-error">
            <p>⚠️ PayPal SDK 加载失败</p>
            <p class="paypal-error-hint">请检查网络连接，或稍后重试</p>
          </div>
          <div v-else id="paypal-button-container" class="paypal-button-container">
            <div class="paypal-loading">正在加载支付按钮...</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pricing-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.pricing-header {
  text-align: center;
  margin-bottom: 50px;
}

.pricing-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 12px;
}

.pricing-header p {
  font-size: 1.1rem;
  color: #6b7280;
  margin-bottom: 30px;
}

.billing-toggle {
  display: inline-flex;
  background: #e5e7eb;
  border-radius: 12px;
  padding: 4px;
}

.billing-toggle button {
  padding: 10px 24px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.billing-toggle button.active {
  background: #fff;
  color: #1a1a2e;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.discount-badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 50px;
}

.pricing-card {
  background: #fff;
  border-radius: 24px;
  padding: 32px;
  border: 2px solid #e5e7eb;
  position: relative;
  transition: all 0.3s ease;
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

.pricing-card.highlighted {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  color: #fff;
  transform: scale(1.02);
}

.pricing-card.highlighted:hover {
  transform: scale(1.02) translateY(-4px);
}

.plan-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

.plan-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.plan-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.plan-desc {
  font-size: 0.95rem;
  opacity: 0.8;
  margin-bottom: 24px;
}

.plan-price {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
}

.currency {
  font-size: 1.5rem;
  font-weight: 600;
}

.amount {
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1;
}

.period {
  font-size: 1rem;
  opacity: 0.7;
  margin-left: 4px;
}

.savings-note {
  background: rgba(255,255,255,0.2);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 20px;
  display: inline-block;
}

.pricing-card:not(.highlighted) .savings-note {
  background: #f0f9ff;
  color: #0369a1;
}

.feature-list {
  list-style: none;
  margin: 24px 0;
  flex: 1;
}

.feature-list li {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
}

.pricing-card:not(.highlighted) .feature-list li {
  border-bottom-color: #e5e7eb;
}

.feature-list li.disabled {
  opacity: 0.5;
}

.feature-icon {
  font-size: 1.1rem;
}

.plan-button {
  width: 100%;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: auto;
}

.plan-button.primary {
  background: #fff;
  color: #667eea;
  border: none;
}

.plan-button.primary:hover {
  background: #f0f2f5;
}

.plan-button.outline {
  background: transparent;
  border: 2px solid currentColor;
}

.pricing-card.highlighted .plan-button.outline {
  border-color: rgba(255,255,255,0.5);
  color: #fff;
}

.pricing-card:not(.highlighted) .plan-button.outline {
  border-color: #667eea;
  color: #667eea;
}

.plan-button.outline:hover {
  background: rgba(102, 126, 234, 0.1);
}

.pricing-footer {
  text-align: center;
  padding: 30px;
  background: #f9fafb;
  border-radius: 16px;
}

.trust-badges {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 16px;
  color: #6b7280;
  font-size: 0.95rem;
}

.footer-note {
  color: #9ca3af;
  font-size: 0.85rem;
}

/* Payment Modal */
.payment-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.payment-modal {
  background: #fff;
  border-radius: 20px;
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a1a2e;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
}

.modal-body {
  padding: 24px;
}

.order-summary {
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.order-summary h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.order-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 0.95rem;
  color: #374151;
}

.order-row.total {
  border-top: 1px solid #e5e7eb;
  margin-top: 8px;
  padding-top: 16px;
  font-weight: 700;
  font-size: 1.1rem;
  color: #1a1a2e;
}

.order-row.usd-note {
  font-size: 0.85rem;
  color: #9ca3af;
  border-top: 1px dashed #e5e7eb;
  margin-top: 8px;
}

.paypal-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 16px;
}

.paypal-button-container {
  min-height: 150px;
}

.paypal-loading {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.paypal-error {
  text-align: center;
  padding: 20px;
  background: #fef2f2;
  border-radius: 8px;
  color: #991b1b;
}

.paypal-error-hint {
  font-size: 0.85rem;
  margin-top: 8px;
  color: #dc2626;
}

@media (max-width: 768px) {
  .pricing-page {
    padding: 20px;
  }
  
  .pricing-header h1 {
    font-size: 2rem;
  }
  
  .pricing-grid {
    grid-template-columns: 1fr;
  }
  
  .pricing-card.highlighted {
    transform: none;
  }
}
</style>
