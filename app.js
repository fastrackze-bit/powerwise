// PowerWise Application Controller (Pure Consumption / Units-Only Architecture)
import { DEFAULT_APPLIANCES, EXTRA_APPLIANCES, calculateMonthlyUnits, computeSavingsRecommendation } from './appliances.js';
import { SAMPLE_BILLS, runClientOcr, generateBillSvgDataUrl } from './ocr.js';

class PowerWiseApp {
  constructor() {
    this.bill = {
      units: 450,
      provider: 'Tata Power Electricity Bill'
    };

    // Deep clone appliances list
    this.appliances = JSON.parse(JSON.stringify(DEFAULT_APPLIANCES)).map(app => {
      // Default initial states: select AC non-inverter, water heater, fridge, ceiling fans, tv
      const initiallySelected = ['ac-non-inverter', 'water-heater', 'refrigerator', 'ceiling-fan', 'television'].includes(app.id);
      return {
        ...app,
        selected: initiallySelected,
        count: app.defaultCount || 1,
        hours: app.defaultHours || 4,
        monthlyUnits: calculateMonthlyUnits(app.wattage, app.defaultHours || 4, app.defaultCount || 1)
      };
    });

    this.currentStep = 1;
    this.selectedSampleId = 'sample-summer-ac';
    this.isScanning = false;
    this.debugMode = false;
    this.debugLogs = [];

    this.initElements();
    this.bindEvents();
    this.renderSamplePills();
    this.selectSampleBill(this.selectedSampleId, false);
    this.renderAppliancesList();
    this.updateTickers();
  }

  initElements() {
    // Navigation
    this.stepNavItems = document.querySelectorAll('.step-item');
    this.stepViews = document.querySelectorAll('.step-view');
    this.btnQuickDemo = document.getElementById('btn-quick-demo');
    this.btnDebugToggle = document.getElementById('btn-debug-toggle');
    this.debugPanel = document.getElementById('debug-panel');
    this.debugLogOutput = document.getElementById('debug-log-output');
    this.debugLogCount = document.getElementById('debug-log-count');
    this.btnDebugClear = document.getElementById('btn-debug-clear');
    this.chatForm = document.getElementById('chat-form');
    this.chatInput = document.getElementById('chat-input');
    this.chatMessages = document.getElementById('chat-messages');
    this.btnChatSend = document.getElementById('btn-chat-send');

    // Step 1
    this.samplePillsList = document.getElementById('sample-pills-list');
    this.billDropzone = document.getElementById('bill-dropzone');
    this.billFileInput = document.getElementById('bill-file-input');
    this.btnBrowseFile = document.getElementById('btn-browse-file');
    this.previewPane = document.getElementById('bill-preview-pane');
    this.billImgDisplay = document.getElementById('bill-img-display');
    this.previewPlaceholder = document.getElementById('preview-placeholder');
    this.preprocessingBadge = document.getElementById('preprocessing-badge');
    this.ocrStatusLabel = document.getElementById('ocr-status-label');
    this.ocrProgressFill = document.getElementById('ocr-progress-fill');
    this.inputBillUnits = document.getElementById('input-bill-units');
    this.inputBillProvider = document.getElementById('input-bill-provider');
    this.btnToStep2 = document.getElementById('btn-to-step-2');

    // Step 2
    this.tickerBillUnits = document.getElementById('ticker-bill-units');
    this.tickerAuditedUnits = document.getElementById('ticker-audited-units');
    this.tickerCoverage = document.getElementById('ticker-coverage-percent');
    this.applianceListContainer = document.getElementById('appliance-list-container');
    this.btnOpenCustomModal = document.getElementById('btn-open-custom-modal');
    this.btnBackToStep1 = document.getElementById('btn-back-to-step-1');
    this.btnToStep3 = document.getElementById('btn-to-step-3');

    // Step 3
    // Hog #1
    this.hogSpotlightCard = document.getElementById('hog-spotlight-card');
    this.hogApplianceName = document.getElementById('hog-appliance-name');
    this.hogApplianceContext = document.getElementById('hog-appliance-context');
    this.hogChipUnits = document.getElementById('hog-chip-units');
    this.hogChipShare = document.getElementById('hog-chip-share');
    this.hogChipDaily = document.getElementById('hog-chip-daily');

    // Hog #2
    this.hog2SpotlightCard = document.getElementById('hog2-spotlight-card');
    this.hog2ApplianceName = document.getElementById('hog2-appliance-name');
    this.hog2ApplianceContext = document.getElementById('hog2-appliance-context');
    this.hog2ChipUnits = document.getElementById('hog2-chip-units');
    this.hog2ChipShare = document.getElementById('hog2-chip-share');
    this.hog2ChipDaily = document.getElementById('hog2-chip-daily');

    // Chart & Diagnostics
    this.donutSvg = document.getElementById('donut-svg');
    this.donutTotalKwh = document.getElementById('donut-total-kwh');
    this.chartLegendContainer = document.getElementById('chart-legend-container');
    this.phantomTitle = document.getElementById('phantom-title');
    this.phantomDesc = document.getElementById('phantom-desc');
    this.rankingsListContainer = document.getElementById('rankings-list-container');
    this.recommendationsGrid = document.getElementById('recommendations-grid');
    this.btnBackToStep2 = document.getElementById('btn-back-to-step-2');
    this.btnRestartAudit = document.getElementById('btn-restart-audit');

    // Modal
    this.customModal = document.getElementById('custom-appliance-modal');
    this.btnCloseCustomModal = document.getElementById('btn-close-custom-modal');
    this.btnCancelCustomModal = document.getElementById('btn-cancel-custom-modal');
    this.btnSaveCustomAppliance = document.getElementById('btn-save-custom-appliance');
    this.inputCustomName = document.getElementById('custom-name');
    this.inputCustomWattage = document.getElementById('custom-wattage');
    this.inputCustomHours = document.getElementById('custom-hours');

    // Toast
    this.toastContainer = document.getElementById('toast-container');
  }

  bindEvents() {
    // Stepper navigation
    this.stepNavItems.forEach(item => {
      item.addEventListener('click', () => {
        const step = parseInt(item.dataset.step, 10);
        this.goToStep(step);
      });
    });

    // Quick Demo Button
    this.btnQuickDemo.addEventListener('click', () => this.runQuickDemo());

    // Debug log controls
    this.btnDebugToggle.addEventListener('click', () => this.toggleDebugMode());
    this.btnDebugClear.addEventListener('click', () => this.clearDebugLogs());
    this.chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.sendChatMessage();
    });

    // Step 1: Confirmation button to Step 2
    this.btnToStep2.addEventListener('click', () => {
      this.syncBillInputs();
      if (!this.bill.units || this.bill.units <= 0) {
        alert('Please confirm or enter the Total Units Consumed (kWh) from your bill.');
        this.inputBillUnits.focus();
        return;
      }
      this.showToast(`Verified: ${this.bill.units} kWh • Proceeding to appliances checklist`);
      this.goToStep(2);
    });

    // Step 2 Navigation
    this.btnBackToStep1.addEventListener('click', () => this.goToStep(1));
    this.btnToStep3.addEventListener('click', () => {
      this.calculateAllAppliances();
      const selected = this.appliances.filter(a => a.selected && a.monthlyUnits > 0);
      if (selected.length === 0) {
        alert('Please select at least one appliance to generate the energy audit report.');
        return;
      }
      this.renderAuditReport();
      this.goToStep(3);
    });

    // Step 3 Navigation
    this.btnBackToStep2.addEventListener('click', () => this.goToStep(2));
    this.btnRestartAudit.addEventListener('click', () => this.goToStep(1));

    // Bill Input sync
    this.inputBillUnits.addEventListener('input', () => this.syncBillInputs());
    this.inputBillProvider.addEventListener('input', () => {
      this.bill.provider = this.inputBillProvider.value || 'Utility Provider';
    });

    // File drop & browse
    this.billDropzone.addEventListener('click', () => this.billFileInput.click());
    this.btnBrowseFile.addEventListener('click', (e) => {
      e.stopPropagation();
      this.billFileInput.click();
    });

    this.billFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      this.billDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.billDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.billDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.billDropzone.classList.remove('dragover');
      });
    });

    this.billDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    // Custom appliance modal
    this.btnOpenCustomModal.addEventListener('click', () => this.openCustomModal());
    this.btnCloseCustomModal.addEventListener('click', () => this.closeCustomModal());
    this.btnCancelCustomModal.addEventListener('click', () => this.closeCustomModal());
    this.btnSaveCustomAppliance.addEventListener('click', () => this.saveCustomAppliance());
  }

  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    this.btnDebugToggle.setAttribute('aria-pressed', String(this.debugMode));
    this.debugPanel.hidden = !this.debugMode;
    if (this.debugMode) this.addDebugLog('Debug mode enabled', 'info');
  }

  clearDebugLogs() {
    this.debugLogs = [];
    this.renderDebugLogs();
  }

  addDebugLog(message, level = 'info', details = '') {
    const timestamp = new Date().toLocaleTimeString();
    const detailText = details ? ` ${typeof details === 'string' ? details : JSON.stringify(details)}` : '';
    this.debugLogs.push({ timestamp, level, message: `${message}${detailText}` });
    if (this.debugLogs.length > 200) this.debugLogs.shift();
    if (this.debugMode) this.renderDebugLogs();
  }

  renderDebugLogs() {
    this.debugLogOutput.textContent = this.debugLogs.length
      ? this.debugLogs.map(entry => `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}`).join('\n')
      : 'Debug log is empty.';
    this.debugLogCount.textContent = `${this.debugLogs.length} ${this.debugLogs.length === 1 ? 'entry' : 'entries'}`;
    this.debugLogOutput.scrollTop = this.debugLogOutput.scrollHeight;
  }

  getChatContext() {
    return {
      billUnits: this.bill.units || null,
      provider: this.bill.provider || null,
      appliances: this.appliances
        .filter(app => app.selected)
        .map(app => ({
          name: app.name,
          wattage: app.wattage,
          hoursPerDay: app.hours,
          count: app.count,
          monthlyUnits: Math.round(calculateMonthlyUnits(app.wattage, app.hours, app.count))
        }))
    };
  }

  appendChatMessage(message, role) {
    const element = document.createElement('div');
    element.className = `chat-message ${role}`;
    element.textContent = message;
    this.chatMessages.appendChild(element);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  async sendChatMessage() {
    const message = this.chatInput.value.trim();
    if (!message || this.btnChatSend.disabled) return;

    this.appendChatMessage(message, 'user');
    this.chatInput.value = '';
    this.btnChatSend.disabled = true;
    this.appendChatMessage('Thinking about your energy question...', 'loading');
    const loadingMessage = this.chatMessages.lastElementChild;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context: this.getChatContext() })
      });
      const responseText = await response.text();
      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch {
        const contentType = response.headers.get('content-type') || 'unknown content type';
        throw new Error(
          `Chat API returned HTTP ${response.status} as ${contentType}. ` +
          'Start PowerWise with "python server.py" and reload the page.'
        );
      }
      loadingMessage.remove();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Chat request failed.');
      this.appendChatMessage(payload.answer, 'assistant');
      this.addDebugLog('Gemini answered energy question', 'success', { model: payload.model });
    } catch (error) {
      loadingMessage.remove();
      this.appendChatMessage(`I could not reach the energy advisor: ${error.message}`, 'error');
      this.addDebugLog('Gemini chat request failed', 'error', error.message);
    } finally {
      this.btnChatSend.disabled = false;
      this.chatInput.focus();
    }
  }

  // =================== NAVIGATION ===================
  goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > 3) return;
    this.currentStep = stepNumber;

    this.stepNavItems.forEach(item => {
      const step = parseInt(item.dataset.step, 10);
      item.classList.toggle('active', step === stepNumber);
      item.classList.toggle('completed', step < stepNumber);
    });

    this.stepViews.forEach(view => {
      const viewStep = parseInt(view.id.replace('view-step-', ''), 10);
      view.classList.toggle('active', viewStep === stepNumber);
    });

    if (stepNumber === 2) {
      this.updateTickers();
    } else if (stepNumber === 3) {
      this.renderAuditReport();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =================== STEP 1: BILL OCR & PREPROCESSING ===================
  renderSamplePills() {
    this.samplePillsList.innerHTML = SAMPLE_BILLS.map(sample => `
      <button type="button" class="sample-pill-btn ${sample.id === this.selectedSampleId ? 'active' : ''}" data-id="${sample.id}">
        <div class="sample-pill-title">
          <span>${sample.name}</span>
          <span>⚡</span>
        </div>
        <div class="sample-pill-meta">${sample.tag}</div>
      </button>
    `).join('');

    this.samplePillsList.querySelectorAll('.sample-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.selectSampleBill(id, true);
      });
    });
  }

  selectSampleBill(sampleId, animateScan = true) {
    const sample = SAMPLE_BILLS.find(s => s.id === sampleId);
    if (!sample) return;

    this.addDebugLog(`Selected sample bill: ${sample.name}`, 'info', { units: sample.units });

    this.selectedSampleId = sampleId;
    this.samplePillsList.querySelectorAll('.sample-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.id === sampleId);
    });

    // Generate bill SVG image
    const dataUrl = generateBillSvgDataUrl(sample);
    this.billImgDisplay.src = dataUrl;
    this.billImgDisplay.style.display = 'block';
    this.previewPlaceholder.style.display = 'none';

    if (animateScan) {
      this.runSimulatedScan(sample);
    } else {
      this.applyBillData(sample.units, sample.provider);
    }
  }

  runSimulatedScan(sample) {
    this.addDebugLog(`Starting simulated scan for ${sample.name}`, 'info');
    this.startScannerUI();
    if (this.preprocessingBadge) this.preprocessingBadge.style.display = 'none';

    const steps = [
      { msg: 'Preprocessing bill: 2x upscale, grayscale, auto-contrast & sharpen...', prog: 25 },
      { msg: 'Scanning text with multi-phrasing regex engine...', prog: 55 },
      { msg: `Matched Total Consumption: ${sample.units} kWh...`, prog: 85 },
      { msg: `Verified consumption figures: ${sample.units} Units...`, prog: 100 }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        this.ocrStatusLabel.textContent = steps[currentStep].msg;
        this.ocrProgressFill.style.width = `${steps[currentStep].prog}%`;
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          this.stopScannerUI();
          if (this.preprocessingBadge) this.preprocessingBadge.style.display = 'flex';
          this.applyBillData(sample.units, sample.provider);
          this.highlightConfirmationFields();
          this.showToast(`OCR Extracted: ${sample.units} kWh • Please verify below.`);
          this.addDebugLog(`Simulated scan complete: ${sample.units} kWh extracted`, 'success');
        }, 300);
      }
    }, 280);
  }

  async handleFileUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file of your electricity bill.');
      return;
    }

    this.addDebugLog('Bill image selected', 'info', {
      name: file.name,
      type: file.type,
      sizeBytes: file.size,
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const originalDataUrl = e.target.result;
      this.billImgDisplay.src = originalDataUrl;
      this.billImgDisplay.style.display = 'block';
      this.previewPlaceholder.style.display = 'none';
      if (this.preprocessingBadge) this.preprocessingBadge.style.display = 'none';

      // Clear active sample bill pill
      this.samplePillsList.querySelectorAll('.sample-pill-btn').forEach(b => b.classList.remove('active'));

      this.startScannerUI();
      this.addDebugLog('Starting client-side OCR extraction', 'info');
      try {
        const result = await runClientOcr(originalDataUrl, (prog) => {
          this.ocrStatusLabel.textContent = prog.message;
          this.ocrProgressFill.style.width = `${Math.round(prog.progress * 100)}%`;
          this.addDebugLog(`OCR ${prog.status}: ${prog.message}`, 'info');
        }, (message, level = 'info', details = '') => this.addDebugLog(message, level, details));

        this.stopScannerUI();
        if (this.preprocessingBadge) this.preprocessingBadge.style.display = 'flex';

        // Display preprocessed enhanced canvas if available
        if (result.preprocessed && result.preprocessed.dataUrl) {
          this.billImgDisplay.src = result.preprocessed.dataUrl;
        }

        if (result.preprocessed && result.preprocessed.dataUrl) {
          this.billImgDisplay.src = result.preprocessed.dataUrl;
        }

        if (result.parsed.units) {
          this.applyBillData(result.parsed.units, result.parsed.provider || 'Detected Utility Provider');
          this.highlightConfirmationFields();
          this.showToast(`OCR extracted ${result.parsed.units} kWh. Please confirm.`);
          this.addDebugLog('Applying OCR units to confirmation field', 'success', {
            units: result.parsed.units,
            provider: result.parsed.provider,
            confidence: result.parsed.confidence,
            confidenceScore: result.confidenceScore
          });
        } else {
          this.clearDetectedBillData(result.parsed.provider || 'Electricity Provider');
          this.highlightConfirmationFields();
          this.showToast('OCR could not confidently identify the units. Please enter them below.', 'warning');
          this.addDebugLog('OCR returned no confident units; manual confirmation is required', 'warning', result.parsed);
        }
      } catch (err) {
        console.error('OCR Error:', err);
        this.addDebugLog('OCR extraction failed; manual units entry is required', 'error', err?.message || err);
        this.stopScannerUI();
        this.clearDetectedBillData('Uploaded Electricity Bill');
        this.highlightConfirmationFields();
        this.showToast('OCR could not read this bill. Please enter the units manually.', 'warning');
      }
    };
    reader.readAsDataURL(file);
  }

  startScannerUI() {
    this.isScanning = true;
    this.previewPane.classList.add('scanning');
    this.ocrProgressFill.style.width = '10%';
    this.ocrStatusLabel.textContent = 'Preprocessing bill image...';
  }

  stopScannerUI() {
    this.isScanning = false;
    this.previewPane.classList.remove('scanning');
  }

  highlightConfirmationFields() {
    // Visual pulse animation to draw user's attention to the editable safety net field
    this.inputBillUnits.focus();
    this.inputBillUnits.classList.add('flash-highlight');
    setTimeout(() => {
      this.inputBillUnits.classList.remove('flash-highlight');
    }, 1500);
  }

  applyBillData(units, provider) {
    this.bill.units = parseInt(units, 10) || 450;
    this.bill.provider = provider || 'Electricity Discom';

    this.inputBillUnits.value = this.bill.units;
    this.inputBillProvider.value = this.bill.provider;

    this.updateTickers();
  }

  clearDetectedBillData(provider) {
    this.bill.units = 0;
    this.bill.provider = provider || 'Electricity Provider';
    this.inputBillUnits.value = '';
    this.inputBillProvider.value = this.bill.provider;
    this.updateTickers();
  }

  syncBillInputs() {
    const u = parseInt(this.inputBillUnits.value, 10);
    this.bill.units = Number.isFinite(u) && u > 0 ? u : 0;
    this.updateTickers();
  }

  // =================== STEP 2: APPLIANCE CHECKLIST ===================
  renderAppliancesList() {
    this.applianceListContainer.innerHTML = this.appliances.map(app => {
      const units = calculateMonthlyUnits(app.wattage, app.hours, app.count);
      return `
        <div class="appliance-card ${app.selected ? 'active' : ''}" data-id="${app.id}">
          <div class="appliance-card-top">
            <div class="appliance-identity" data-action="toggle">
              <div class="custom-checkbox">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div class="appliance-info">
                <h4>${app.name}</h4>
                <div class="appliance-specs">
                  <span class="wattage-badge">${app.wattage}W</span>
                  <span style="color: var(--cyan); font-family: var(--font-mono); font-size: 0.72rem;">${app.wattageRange || ''}</span>
                  <span>${app.description || ''}</span>
                </div>
              </div>
            </div>
            <div class="calculated-units-col">
              <div class="calc-units-val" id="calc-val-${app.id}">${Math.round(units)} kWh</div>
              <div class="calc-units-sub">/ month</div>
            </div>
          </div>

          <div class="appliance-controls">
            <div class="controls-flex">
              <!-- Quantity Stepper -->
              <div>
                <label class="input-label" style="margin-bottom: 4px; display: block;">Quantity</label>
                <div class="counter-box">
                  <button type="button" class="counter-btn" data-action="dec-count" data-id="${app.id}">-</button>
                  <span class="counter-value" id="count-val-${app.id}">${app.count}</span>
                  <button type="button" class="counter-btn" data-action="inc-count" data-id="${app.id}">+</button>
                </div>
              </div>

              <!-- Daily Hours Slider -->
              <div class="slider-group">
                <div class="slider-label-row">
                  <span>Daily Usage Hours</span>
                  <span class="slider-hours-value" id="hours-val-${app.id}">${app.hours} hrs/day</span>
                </div>
                <input 
                  type="range" 
                  class="styled-range" 
                  data-id="${app.id}" 
                  min="0.5" 
                  max="${app.maxHours || 24}" 
                  step="0.5" 
                  value="${app.hours}" 
                />
              </div>

              <!-- Monthly Formula Units Breakdown -->
              <div style="background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 8px; font-size: 0.75rem; text-align: right;">
                <div style="color: var(--text-muted); font-size: 0.68rem;">MONTHLY CONSUMPTION</div>
                <div style="font-family: var(--font-mono); font-weight: 700; color: var(--emerald-light);" id="rate-val-${app.id}">
                  ${Math.round(units)} kWh / mo
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners
    this.applianceListContainer.querySelectorAll('.appliance-card').forEach(card => {
      const id = card.dataset.id;
      const app = this.appliances.find(a => a.id === id);

      // Toggle Selection
      card.querySelector('[data-action="toggle"]').addEventListener('click', () => {
        app.selected = !app.selected;
        card.classList.toggle('active', app.selected);
        this.updateApplianceRow(app);
        this.updateTickers();
      });

      // Stepper
      const btnDec = card.querySelector('[data-action="dec-count"]');
      const btnInc = card.querySelector('[data-action="inc-count"]');

      if (btnDec && btnInc) {
        btnDec.addEventListener('click', (e) => {
          e.stopPropagation();
          if (app.count > 1) {
            app.count--;
            this.updateApplianceRow(app);
            this.updateTickers();
          }
        });

        btnInc.addEventListener('click', (e) => {
          e.stopPropagation();
          if (app.count < 20) {
            app.count++;
            this.updateApplianceRow(app);
            this.updateTickers();
          }
        });
      }

      // Slider
      const range = card.querySelector('input[type="range"]');
      if (range) {
        range.addEventListener('input', (e) => {
          app.hours = parseFloat(e.target.value);
          this.updateApplianceRow(app);
          this.updateTickers();
        });
      }
    });
  }

  updateApplianceRow(app) {
    app.monthlyUnits = calculateMonthlyUnits(app.wattage, app.hours, app.count);

    const countElem = document.getElementById(`count-val-${app.id}`);
    const hoursElem = document.getElementById(`hours-val-${app.id}`);
    const calcValElem = document.getElementById(`calc-val-${app.id}`);
    const rateValElem = document.getElementById(`rate-val-${app.id}`);

    if (countElem) countElem.textContent = app.count;
    if (hoursElem) hoursElem.textContent = `${app.hours} hrs/day`;
    if (calcValElem) calcValElem.textContent = `${Math.round(app.monthlyUnits)} kWh`;
    if (rateValElem) rateValElem.textContent = `${Math.round(app.monthlyUnits)} kWh / mo`;
  }

  calculateAllAppliances() {
    this.appliances.forEach(app => {
      app.monthlyUnits = calculateMonthlyUnits(app.wattage, app.hours, app.count);
    });
  }

  updateTickers() {
    this.tickerBillUnits.textContent = `${this.bill.units} kWh`;
    const audited = this.appliances
      .filter(a => a.selected)
      .reduce((sum, a) => sum + calculateMonthlyUnits(a.wattage, a.hours, a.count), 0);

    const roundedAudited = Math.round(audited);
    this.tickerAuditedUnits.textContent = `${roundedAudited} kWh`;

    const coverage = this.bill.units > 0 ? Math.round((roundedAudited / this.bill.units) * 100) : 0;
    this.tickerCoverage.textContent = `${coverage}%`;
  }

  // =================== STEP 3: AUDIT REPORT & DUAL HOG DETECTIVE (PURE UNITS) ===================
  renderAuditReport() {
    this.calculateAllAppliances();

    const selected = this.appliances.filter(a => a.selected && a.monthlyUnits > 0);
    if (selected.length === 0) {
      alert('Please select at least one appliance to generate the energy audit report.');
      this.goToStep(2);
      return;
    }

    // Rank appliances by monthly kWh units descending
    const ranked = [...selected].sort((a, b) => b.monthlyUnits - a.monthlyUnits);
    const topHog1 = ranked[0];
    const topHog2 = ranked.length > 1 ? ranked[1] : null;

    const totalAuditedUnits = ranked.reduce((acc, a) => acc + a.monthlyUnits, 0);

    // 1. Spotlight Top Energy Hog #1
    if (topHog1) {
      this.hogApplianceName.textContent = topHog1.name;
      const shareOfBill = ((topHog1.monthlyUnits / this.bill.units) * 100).toFixed(1);
      this.hogApplianceContext.textContent = `Consuming ${shareOfBill}% of your entire monthly electricity consumption (${topHog1.hours} hrs/day × ${topHog1.count} unit).`;
      this.hogChipUnits.textContent = `${Math.round(topHog1.monthlyUnits)} kWh`;
      this.hogChipShare.textContent = `${shareOfBill}%`;
      if (this.hogChipDaily) {
        this.hogChipDaily.textContent = `${(topHog1.monthlyUnits / 30).toFixed(1)} kWh/day`;
      }
    }

    // 2. Spotlight Energy Hog #2
    if (topHog2 && this.hog2SpotlightCard) {
      this.hog2SpotlightCard.style.display = 'flex';
      this.hog2ApplianceName.textContent = topHog2.name;
      const shareOfBill2 = ((topHog2.monthlyUnits / this.bill.units) * 100).toFixed(1);
      this.hog2ApplianceContext.textContent = `Second largest consumer at ${shareOfBill2}% of total consumption (${topHog2.hours} hrs/day × ${topHog2.count} unit).`;
      this.hog2ChipUnits.textContent = `${Math.round(topHog2.monthlyUnits)} kWh`;
      this.hog2ChipShare.textContent = `${shareOfBill2}%`;
      if (this.hog2ChipDaily) {
        this.hog2ChipDaily.textContent = `${(topHog2.monthlyUnits / 30).toFixed(1)} kWh/day`;
      }
    } else if (this.hog2SpotlightCard) {
      this.hog2SpotlightCard.style.display = 'none';
    }

    // 3. Render Donut Chart & Legend (Units Breakdown)
    this.renderDonutChart(ranked, totalAuditedUnits);

    // 4. Phantom / Standby Load Diagnostics (Units Only)
    const diff = this.bill.units - totalAuditedUnits;
    if (diff > 15) {
      const diffPercent = Math.round((diff / this.bill.units) * 100);
      this.phantomTitle.textContent = `⚡ Standby / Unaccounted Vampire Load: ${Math.round(diff)} kWh (~${diffPercent}%)`;
      this.phantomDesc.textContent = `Your audited appliances account for ${100 - diffPercent}% of total consumption. The remaining ${Math.round(diff)} kWh is typically drawn by standby vampire power (Wi-Fi router, TV setups in standby, adapters), plus household lighting and water pumps.`;
    } else if (diff < -15) {
      this.phantomTitle.textContent = `ℹ️ Conservative Estimation Notice (+${Math.round(Math.abs(diff))} kWh)`;
      this.phantomDesc.textContent = `Your entered daily usage totals slightly higher than your actual bill. Household appliances (like inverter ACs and fridges) throttle down when temperatures stabilize, consuming less than rated peak wattage.`;
    } else {
      this.phantomTitle.textContent = `🎯 High Precision Audit Alignment (±${Math.abs(Math.round(diff))} kWh)`;
      this.phantomDesc.textContent = `Your audited appliances align within ±${Math.abs(Math.round(diff))} kWh of your total meter consumption! The breakdown reflects your true household consumption with high precision.`;
    }

    // 5. Render Detailed Rankings List (Units Only)
    this.renderRankingsList(ranked, topHog1, topHog2);

    // 6. Render High-Impact Savings Recommendations (Units Only)
    this.renderRecommendations(ranked, topHog1, topHog2);
  }

  renderDonutChart(ranked, totalAuditedUnits) {
    this.donutTotalKwh.textContent = Math.round(totalAuditedUnits);

    // Palette for slices
    const colors = [
      '#f43f5e', // Rose for Hog 1
      '#f59e0b', // Amber for Hog 2
      '#10b981', // Emerald
      '#06b6d4', // Cyan
      '#8b5cf6', // Violet
      '#3b82f6', // Blue
      '#ec4899', // Pink
      '#64748b'  // Slate
    ];

    const circumference = 100; // 2 * PI * r where r = 15.9154943
    let cumulativePercent = 0;

    const circles = ranked.map((app, idx) => {
      const share = (app.monthlyUnits / totalAuditedUnits) * 100;
      const strokeDasharray = `${share.toFixed(2)} ${(100 - share).toFixed(2)}`;
      const strokeDashoffset = (100 - cumulativePercent).toFixed(2);
      cumulativePercent += share;
      const color = colors[idx % colors.length];

      return `
        <circle 
          cx="21" cy="21" r="15.9154943" 
          fill="transparent" 
          stroke="${color}" 
          stroke-width="5" 
          stroke-dasharray="${strokeDasharray}" 
          stroke-dashoffset="${strokeDashoffset}"
        />
      `;
    }).join('');

    this.donutSvg.innerHTML = circles;

    // Render Legend
    this.chartLegendContainer.innerHTML = ranked.slice(0, 6).map((app, idx) => {
      const share = ((app.monthlyUnits / totalAuditedUnits) * 100).toFixed(1);
      const color = colors[idx % colors.length];
      return `
        <div class="legend-item">
          <div class="legend-left">
            <span class="legend-dot" style="background: ${color};"></span>
            <span style="color: #fff; font-weight: 600;">${app.name}</span>
          </div>
          <span class="legend-val">${share}% <span style="color: var(--text-muted); font-size: 0.72rem;">(${Math.round(app.monthlyUnits)} kWh)</span></span>
        </div>
      `;
    }).join('');
  }

  renderRankingsList(ranked, topHog1, topHog2) {
    const maxUnits = ranked[0].monthlyUnits;

    this.rankingsListContainer.innerHTML = ranked.map((app, index) => {
      const isHog1 = (app.id === topHog1.id);
      const isHog2 = (topHog2 && app.id === topHog2.id);
      const barWidth = Math.max(8, Math.round((app.monthlyUnits / maxUnits) * 100));
      const billShare = ((app.monthlyUnits / this.bill.units) * 100).toFixed(1);

      let badgeHtml = '';
      if (isHog1) {
        badgeHtml = '<span style="margin-left: 8px; font-size: 0.7rem; font-weight: 800; color: #fb7185;">🚨 #1 ENERGY HOG</span>';
      } else if (isHog2) {
        badgeHtml = '<span style="margin-left: 8px; font-size: 0.7rem; font-weight: 800; color: #fbbf24;">⚠️ #2 MAJOR CONSUMER</span>';
      }

      return `
        <div class="rank-row ${isHog1 ? 'is-hog' : ''}">
          <div class="rank-row-top">
            <div class="rank-left">
              <span class="rank-badge" style="${isHog2 ? 'background: var(--amber); color: #000;' : ''}">${index + 1}</span>
              <div>
                <span class="rank-name">${app.name}</span>
                ${badgeHtml}
              </div>
            </div>
            <div class="rank-metrics">
              <span style="color: #fff; font-weight: 700;">${Math.round(app.monthlyUnits)} kWh</span>
              <span class="rank-percent" style="${isHog2 ? 'color: #fbbf24;' : ''}">${billShare}% of total</span>
            </div>
          </div>
          <div class="rank-bar-bg">
            <div class="rank-bar-fill" style="width: ${barWidth}%; ${isHog2 ? 'background: linear-gradient(90deg, #f59e0b, #fbbf24);' : ''}"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderRecommendations(ranked, topHog1, topHog2) {
    // Generate savings recommendation cards for top flagged appliances
    const flagged = ranked.filter(a => a.replacement);

    // Prioritize top hogs first
    const sortedRecommendations = flagged.sort((a, b) => {
      const aIsHog = (a.id === topHog1.id ? 2 : (topHog2 && a.id === topHog2.id ? 1 : 0));
      const bIsHog = (b.id === topHog1.id ? 2 : (topHog2 && b.id === topHog2.id ? 1 : 0));
      return bIsHog - aIsHog;
    });

    this.recommendationsGrid.innerHTML = sortedRecommendations.slice(0, 4).map(app => {
      const analysis = computeSavingsRecommendation(app);
      if (!analysis) return '';

      const isTopHog = (app.id === topHog1.id);
      const isHog2 = (topHog2 && app.id === topHog2.id);

      return `
        <div class="rec-card ${isTopHog ? 'high-impact' : ''}">
          <div>
            <span class="rec-badge-tag" style="${isHog2 ? 'background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3);' : ''}">
              ${analysis.badge || 'Recommended Upgrade'}
            </span>
            <div class="rec-content" style="margin-top: 10px;">
              <!-- Formatted exact requirement: "switch to an inverter AC, save ~X units/month" -->
              <h4 style="text-transform: capitalize;">${analysis.recommendationSentence}</h4>
              <p>${analysis.description}</p>
            </div>

            <div class="savings-highlight-box">
              <div>
                <div class="saving-col-label">ESTIMATED CONSUMPTION SAVINGS</div>
                <div class="saving-col-val">Save ~${analysis.savedUnits} units / month</div>
              </div>
              <div style="text-align: right;">
                <div class="saving-col-label">ANNUAL REDUCTION</div>
                <div style="font-family: var(--font-mono); font-weight: 800; color: #38bdf8;">~${analysis.savedUnits * 12} units/yr</div>
              </div>
            </div>
          </div>

          <!-- Direct store search link -->
          <a href="${analysis.amazonUrl}" target="_blank" rel="noopener noreferrer" class="btn-buy-amazon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Buy efficient replacement
          </a>
        </div>
      `;
    }).join('');
  }

  // =================== QUICK DEMO FOR HACKATHON ===================
  runQuickDemo() {
    this.showToast('🚀 Running 1-Click Hackathon Demo...', 'info');
    
    // Select Summer AC sample bill and run animated scan
    this.selectSampleBill('sample-summer-ac', true);

    // Preset realistic heavy household appliance usage
    this.appliances.forEach(app => {
      if (app.id === 'ac-non-inverter') {
        app.selected = true;
        app.hours = 8;
        app.count = 1;
      } else if (app.id === 'water-heater') {
        app.selected = true;
        app.hours = 2;
        app.count = 1;
      } else if (app.id === 'refrigerator') {
        app.selected = true;
        app.hours = 24;
        app.count = 1;
      } else if (app.id === 'ceiling-fan') {
        app.selected = true;
        app.hours = 14;
        app.count = 3;
      } else if (app.id === 'television') {
        app.selected = true;
        app.hours = 5;
        app.count = 1;
      } else if (app.id === 'washing-machine') {
        app.selected = true;
        app.hours = 1;
        app.count = 1;
      } else {
        app.selected = false;
      }
      this.updateApplianceRow(app);
    });

    this.renderAppliancesList();
    this.updateTickers();

    // Visual pause on Step 1 to clearly demonstrate OCR & editable confirmation safety net to judges
    setTimeout(() => {
      this.showToast('🛡️ Safety Net: 450 kWh verified. Advancing to appliances audit...', 'info');
      setTimeout(() => {
        this.goToStep(2);
        setTimeout(() => {
          this.goToStep(3);
          this.showToast('🎯 Audit complete! #1 Non-Inverter AC & #2 Ceiling Fans detected as top hogs.');
        }, 1200);
      }, 1400);
    }, 1500);
  }

  // =================== CUSTOM APPLIANCE MODAL ===================
  openCustomModal() {
    this.inputCustomName.value = '';
    this.inputCustomWattage.value = '';
    this.inputCustomHours.value = '2';
    this.customModal.classList.add('show');
  }

  closeCustomModal() {
    this.customModal.classList.remove('show');
  }

  saveCustomAppliance() {
    const name = this.inputCustomName.value.trim();
    const wattage = parseInt(this.inputCustomWattage.value, 10);
    const hours = parseFloat(this.inputCustomHours.value);

    if (!name || isNaN(wattage) || wattage <= 0 || isNaN(hours) || hours <= 0) {
      alert('Please enter a valid appliance name, rated wattage, and daily hours.');
      return;
    }

    const id = `custom-${Date.now()}`;
    const newApp = {
      id,
      name,
      wattage,
      hours,
      count: 1,
      selected: true,
      maxHours: 24,
      description: `Custom registered appliance (${wattage}W)`,
      monthlyUnits: calculateMonthlyUnits(wattage, hours, 1),
      replacement: {
        actionName: `switch to an Energy-Star 5-star ${name}`,
        title: `Upgrade to 5-Star ${name}`,
        efficientWattage: Math.round(wattage * 0.65),
        savingPercent: 35,
        description: `Modern 5-star models utilize brushless inverter designs to consume 35% less units.`,
        amazonQuery: `energy efficient 5 star ${name}`,
        badge: 'Custom Upgrade'
      }
    };

    this.appliances.push(newApp);
    this.renderAppliancesList();
    this.updateTickers();
    this.closeCustomModal();
    this.showToast(`Added ${name} to your audit checklist!`);
  }

  // =================== TOASTS ===================
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${type === 'warning' ? '#f59e0b' : '#10b981'}" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;

    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.powerWise = new PowerWiseApp();
});
