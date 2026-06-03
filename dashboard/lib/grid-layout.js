// Grid Layout Manager - drag-and-drop repositioning and resizing
import { saveLayout, loadLayout, resetLayout } from './layout-store.js';

export class GridLayout {
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.options = {
      maxColumns: options.maxColumns || 4,
      ...options
    };
    this.editing = false;
    this.dragItem = null;
    this.dragType = null; // 'card' or 'section'
    this.ghost = null;
    this.indicator = null;
    this.resizing = false;
    this.resizeData = null;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  /**
   * Toggle editing mode on/off
   */
  toggle() {
    if (this.editing) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Enable layout editing mode
   */
  enable() {
    if (this.editing) return;
    this.editing = true;
    document.body.classList.add('layout-editing');
    this._createHandles();
    this._createToolbar();
    this._bindDragEvents();
    this._updateToggleBtn(true);
  }

  /**
   * Disable layout editing mode
   */
  disable() {
    if (!this.editing) return;
    this.editing = false;
    document.body.classList.remove('layout-editing');
    this._removeHandles();
    this._removeToolbar();
    this._unbindDragEvents();
    this._updateToggleBtn(false);
  }

  /**
   * Get current layout state as an array of position objects
   */
  getLayout() {
    const layout = [];
    const sections = this.container.querySelectorAll('[data-grid-id]');
    sections.forEach((section) => {
      const sectionId = section.getAttribute('data-grid-id');
      // Section order
      const sectionIndex = Array.from(this.container.children).filter(
        (el) => el.hasAttribute('data-grid-id')
      ).indexOf(section);

      // Cards within this section
      const cards = section.querySelectorAll('[data-grid-id]');
      if (cards.length === 0) {
        layout.push({
          id: sectionId,
          section: '__root',
          order: sectionIndex,
          colSpan: 1,
          rowSpan: 1
        });
      } else {
        layout.push({
          id: sectionId,
          section: '__root',
          order: sectionIndex,
          colSpan: 1,
          rowSpan: 1
        });
        cards.forEach((card, cardIndex) => {
          const cardId = card.getAttribute('data-grid-id');
          const colSpan = parseInt(card.getAttribute('data-col-span') || '1', 10);
          layout.push({
            id: cardId,
            section: sectionId,
            order: cardIndex,
            colSpan: colSpan,
            rowSpan: 1
          });
        });
      }
    });
    return layout;
  }

  /**
   * Apply a saved layout to the DOM
   */
  applyLayout(layout) {
    if (!layout || !Array.isArray(layout) || layout.length === 0) return;

    // Sort sections by order
    const sectionItems = layout.filter((item) => item.section === '__root');
    sectionItems.sort((a, b) => a.order - b.order);

    // Reorder sections
    sectionItems.forEach((item) => {
      const el = this.container.querySelector(`[data-grid-id="${item.id}"]`);
      if (el) {
        this.container.appendChild(el);
      }
    });

    // For each section, reorder its cards
    sectionItems.forEach((sectionItem) => {
      const sectionEl = this.container.querySelector(`[data-grid-id="${sectionItem.id}"]`);
      if (!sectionEl) return;

      const cardItems = layout
        .filter((item) => item.section === sectionItem.id)
        .sort((a, b) => a.order - b.order);

      cardItems.forEach((cardItem) => {
        const cardEl = sectionEl.querySelector(`[data-grid-id="${cardItem.id}"]`);
        if (cardEl) {
          sectionEl.appendChild(cardEl);
          if (cardItem.colSpan && cardItem.colSpan > 1) {
            cardEl.setAttribute('data-col-span', cardItem.colSpan);
            cardEl.style.gridColumn = `span ${cardItem.colSpan}`;
          } else {
            cardEl.removeAttribute('data-col-span');
            cardEl.style.gridColumn = '';
          }
        }
      });
    });

    // Resize charts after layout applied
    this._resizeAllCharts();
  }

  /**
   * Reset to default layout (remove saved, reload page)
   */
  resetLayout() {
    resetLayout();
    // Remove all inline grid styles
    const allItems = this.container.querySelectorAll('[data-grid-id]');
    allItems.forEach((el) => {
      el.style.gridColumn = '';
      el.removeAttribute('data-col-span');
    });
    // Reload to restore DOM order
    window.location.reload();
  }

  /**
   * Save current layout and exit editing
   */
  saveAndDone() {
    const layout = this.getLayout();
    saveLayout(layout);
    this.disable();
  }

  // --- Private Methods ---

  _updateToggleBtn(active) {
    const btn = document.getElementById('layout-toggle-btn');
    if (btn) {
      btn.classList.toggle('active', active);
    }
  }

  _createHandles() {
    // Add drag handles to all cards
    const cards = this.container.querySelectorAll('[data-grid-id] [data-grid-id]');
    cards.forEach((card) => {
      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/></svg>';
      dragHandle.setAttribute('title', 'Drag to reorder');
      card.appendChild(dragHandle);

      // Add resize handle to resizable cards (not KPI cards)
      if (!card.classList.contains('kpi-card')) {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z"/></svg>';
        resizeHandle.setAttribute('title', 'Drag to resize');
        card.appendChild(resizeHandle);
      }
    });

    // Add drag handles to sections for vertical reorder
    const sections = this.container.querySelectorAll(':scope > [data-grid-id]');
    sections.forEach((section) => {
      const sectionHandle = document.createElement('div');
      sectionHandle.className = 'drag-handle drag-handle-section';
      sectionHandle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 15h18v2H3v-2zm0-4h18v2H3v-2zm0-4h18v2H3V7z"/></svg>';
      sectionHandle.setAttribute('title', 'Drag section to reorder');
      section.appendChild(sectionHandle);
    });
  }

  _removeHandles() {
    const handles = this.container.querySelectorAll('.drag-handle, .resize-handle');
    handles.forEach((h) => h.remove());
  }

  _createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'layout-toolbar';
    toolbar.id = 'layout-toolbar';
    toolbar.innerHTML = `
      <button class="layout-toolbar-btn layout-toolbar-reset" id="layout-reset-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
        Reset Layout
      </button>
      <button class="layout-toolbar-btn layout-toolbar-save" id="layout-save-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Save & Done
      </button>
    `;
    document.body.appendChild(toolbar);

    document.getElementById('layout-reset-btn').addEventListener('click', () => {
      this.resetLayout();
    });
    document.getElementById('layout-save-btn').addEventListener('click', () => {
      this.saveAndDone();
    });
  }

  _removeToolbar() {
    const toolbar = document.getElementById('layout-toolbar');
    if (toolbar) toolbar.remove();
  }

  _bindDragEvents() {
    // Card drag within sections
    const cards = this.container.querySelectorAll('[data-grid-id] [data-grid-id]');
    cards.forEach((card) => {
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', this._onCardDragStart.bind(this));
      card.addEventListener('dragend', this._onCardDragEnd.bind(this));
      card.addEventListener('dragover', this._onCardDragOver.bind(this));
      card.addEventListener('drop', this._onCardDrop.bind(this));
    });

    // Section drag
    const sections = this.container.querySelectorAll(':scope > [data-grid-id]');
    sections.forEach((section) => {
      section.addEventListener('dragstart', this._onSectionDragStart.bind(this));
      section.addEventListener('dragend', this._onSectionDragEnd.bind(this));
      section.addEventListener('dragover', this._onSectionDragOver.bind(this));
      section.addEventListener('drop', this._onSectionDrop.bind(this));
    });

    // Resize
    const resizeHandles = this.container.querySelectorAll('.resize-handle');
    resizeHandles.forEach((handle) => {
      handle.addEventListener('mousedown', this._onResizeStart.bind(this));
    });

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  _unbindDragEvents() {
    const cards = this.container.querySelectorAll('[data-grid-id] [data-grid-id]');
    cards.forEach((card) => {
      card.removeAttribute('draggable');
    });
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
  }

  // -- Card Drag Events --

  _onCardDragStart(e) {
    // Only drag from the drag handle
    if (!e.target.closest('.drag-handle') && e.target.closest('.resize-handle')) {
      e.preventDefault();
      return;
    }
    const card = e.target.closest('[data-grid-id]');
    if (!card || card === this.container) return;

    // If the dragged element is a section (direct child), let section handler manage it
    if (card.parentElement === this.container) return;

    this.dragItem = card;
    this.dragType = 'card';
    card.classList.add('drag-ghost');

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.getAttribute('data-grid-id'));
  }

  _onCardDragEnd(e) {
    if (this.dragItem) {
      this.dragItem.classList.remove('drag-ghost');
    }
    this.dragItem = null;
    this.dragType = null;
    this._removeIndicator();
  }

  _onCardDragOver(e) {
    if (this.dragType !== 'card') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.target.closest('[data-grid-id]');
    if (!target || target === this.dragItem || target === this.container) return;
    // Only swap within same parent section
    if (target.parentElement !== this.dragItem.parentElement) return;

    this._showIndicator(target, e);
  }

  _onCardDrop(e) {
    e.preventDefault();
    if (this.dragType !== 'card' || !this.dragItem) return;

    const target = e.target.closest('[data-grid-id]');
    if (!target || target === this.dragItem || target === this.container) return;
    if (target.parentElement !== this.dragItem.parentElement) return;

    // Swap positions
    const parent = target.parentElement;
    const allCards = Array.from(parent.querySelectorAll(':scope > [data-grid-id]'));
    const dragIndex = allCards.indexOf(this.dragItem);
    const targetIndex = allCards.indexOf(target);

    if (dragIndex < targetIndex) {
      parent.insertBefore(this.dragItem, target.nextSibling);
    } else {
      parent.insertBefore(this.dragItem, target);
    }

    this._removeIndicator();
    this._resizeAllCharts();
  }

  // -- Section Drag Events --

  _onSectionDragStart(e) {
    const section = e.target.closest(':scope > [data-grid-id]');
    if (!section || section.parentElement !== this.container) {
      // Possibly triggered by child card - ignore
      return;
    }
    // Only initiate from section handle
    if (!e.target.closest('.drag-handle-section')) {
      return;
    }

    this.dragItem = section;
    this.dragType = 'section';
    section.classList.add('drag-ghost');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', section.getAttribute('data-grid-id'));
  }

  _onSectionDragEnd(e) {
    if (this.dragItem) {
      this.dragItem.classList.remove('drag-ghost');
    }
    this.dragItem = null;
    this.dragType = null;
    this._removeIndicator();
  }

  _onSectionDragOver(e) {
    if (this.dragType !== 'section') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const section = e.target.closest('[data-grid-id]');
    if (!section || section === this.dragItem) return;
    // Must be a direct child of the container
    const directSection = section.closest('.dashboard > [data-grid-id]');
    if (!directSection || directSection === this.dragItem) return;

    this._showSectionIndicator(directSection, e);
  }

  _onSectionDrop(e) {
    e.preventDefault();
    if (this.dragType !== 'section' || !this.dragItem) return;

    const section = e.target.closest('[data-grid-id]');
    if (!section || section === this.dragItem) return;
    const directSection = section.closest('.dashboard > [data-grid-id]');
    if (!directSection || directSection === this.dragItem) return;

    const allSections = Array.from(this.container.querySelectorAll(':scope > [data-grid-id]'));
    const dragIndex = allSections.indexOf(this.dragItem);
    const targetIndex = allSections.indexOf(directSection);

    if (dragIndex < targetIndex) {
      this.container.insertBefore(this.dragItem, directSection.nextSibling);
    } else {
      this.container.insertBefore(this.dragItem, directSection);
    }

    this._removeIndicator();
    this._resizeAllCharts();
  }

  // -- Resize Events --

  _onResizeStart(e) {
    e.preventDefault();
    e.stopPropagation();

    const handle = e.target.closest('.resize-handle');
    if (!handle) return;

    const card = handle.closest('[data-grid-id]');
    if (!card) return;

    const section = card.parentElement;
    const rect = card.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const style = getComputedStyle(section);
    const gap = parseInt(style.gap || style.columnGap || '16', 10);

    // Determine column count from grid template
    const cols = style.gridTemplateColumns.split(' ').length;

    this.resizing = true;
    this.resizeData = {
      card,
      section,
      startX: e.clientX,
      startWidth: rect.width,
      sectionWidth: sectionRect.width,
      gap,
      cols,
      currentSpan: parseInt(card.getAttribute('data-col-span') || '1', 10)
    };

    card.classList.add('resizing');
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
  }

  _onMouseMove(e) {
    if (!this.resizing || !this.resizeData) return;

    const { card, sectionWidth, gap, cols, startX, startWidth } = this.resizeData;
    const dx = e.clientX - startX;
    const newWidth = startWidth + dx;

    // Calculate column width
    const colWidth = (sectionWidth - gap * (cols - 1)) / cols;

    // Determine new span
    let newSpan = Math.round(newWidth / (colWidth + gap));
    newSpan = Math.max(1, Math.min(newSpan, cols));

    if (newSpan !== this.resizeData.currentSpan) {
      this.resizeData.currentSpan = newSpan;
      card.style.gridColumn = `span ${newSpan}`;
      card.setAttribute('data-col-span', newSpan);

      // Resize chart inside
      this._resizeChartInCard(card);
    }
  }

  _onMouseUp(e) {
    if (!this.resizing) return;

    const { card } = this.resizeData;
    card.classList.remove('resizing');
    document.body.style.userSelect = '';
    this.resizing = false;
    this.resizeData = null;
  }

  // -- Indicators --

  _showIndicator(target, e) {
    this._removeIndicator();
    const rect = target.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const insertBefore = e.clientX < midX;

    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';
    indicator.style.position = 'absolute';
    indicator.style.height = `${rect.height}px`;
    indicator.style.top = `${rect.top + window.scrollY}px`;
    indicator.style.left = insertBefore
      ? `${rect.left + window.scrollX - 2}px`
      : `${rect.right + window.scrollX - 2}px`;
    document.body.appendChild(indicator);
    this.indicator = indicator;
  }

  _showSectionIndicator(target, e) {
    this._removeIndicator();
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertBefore = e.clientY < midY;

    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator drop-indicator-horizontal';
    indicator.style.position = 'absolute';
    indicator.style.width = `${rect.width}px`;
    indicator.style.left = `${rect.left + window.scrollX}px`;
    indicator.style.top = insertBefore
      ? `${rect.top + window.scrollY - 2}px`
      : `${rect.bottom + window.scrollY - 2}px`;
    document.body.appendChild(indicator);
    this.indicator = indicator;
  }

  _removeIndicator() {
    if (this.indicator) {
      this.indicator.remove();
      this.indicator = null;
    }
  }

  // -- Chart Resize Utilities --

  _resizeChartInCard(card) {
    const canvas = card.querySelector('canvas');
    if (!canvas) return;
    const chartInstance = Chart.getChart(canvas);
    if (chartInstance) {
      setTimeout(() => chartInstance.resize(), 50);
    }
  }

  _resizeAllCharts() {
    const canvases = this.container.querySelectorAll('canvas');
    canvases.forEach((canvas) => {
      const chartInstance = Chart.getChart(canvas);
      if (chartInstance) {
        setTimeout(() => chartInstance.resize(), 100);
      }
    });
  }

  // -- Keyboard --

  _onKeyDown(e) {
    if (e.key === 'l' || e.key === 'L') {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      this.toggle();
    }
  }

  /**
   * Bind keyboard shortcut externally
   */
  bindKeyboard() {
    document.addEventListener('keydown', this._onKeyDown);
  }
}
