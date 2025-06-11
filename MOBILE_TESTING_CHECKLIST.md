# Mobile Testing Checklist for Journey Calculator

## 📱 Device Breakpoints to Test
- [ ] **Mobile (< 768px)**: iPhone SE, iPhone 12
- [ ] **Tablet (768px - 1024px)**: iPad, Android tablets  
- [ ] **Desktop (> 1024px)**: Standard desktop view

## 🎯 Key Features to Validate

### 1. Layout & Responsiveness
- [ ] **Header**: Proper scaling and text wrapping
- [ ] **Navigation Tabs**: Stack vertically on mobile (< 640px)
- [ ] **Grid Layouts**: 
  - [ ] Single column on mobile (`grid-cols-1`)
  - [ ] Two columns on tablet (`md:grid-cols-2`)
  - [ ] Three columns on desktop (`lg:grid-cols-3`)

### 2. Forms & Input Fields
- [ ] **Touch Targets**: All buttons ≥ 44px height
- [ ] **Input Zoom Prevention**: No zoom when focusing inputs (16px font-size)
- [ ] **Form Layout**: 
  - [ ] Steps Editor stacks properly
  - [ ] Question inputs are touch-friendly
  - [ ] Dropdown selects work on mobile

### 3. Data Tables
- [ ] **Horizontal Scroll**: Tables scroll horizontally without breaking layout
- [ ] **Touch Scrolling**: Smooth scroll behavior on iOS/Android
- [ ] **Table Headers**: Remain visible during scroll
- [ ] **Content Overflow**: No text cutoff or layout breaks

### 4. Analysis Results
- [ ] **Tabs Component**: 
  - [ ] Stack vertically on mobile
  - [ ] Proper height adjustment (`h-auto sm:h-10`)
  - [ ] All tabs accessible via touch
- [ ] **Charts & Visualizations**: Scale appropriately
- [ ] **Result Cards**: Stack in single column on mobile

### 5. Buttons & Interactive Elements  
- [ ] **Button Sizing**: Full width on mobile (`w-full lg:w-auto`)
- [ ] **Touch Responsiveness**: All buttons respond to touch
- [ ] **Loading States**: Proper feedback during operations

### 6. Performance & UX
- [ ] **Viewport Meta Tag**: No horizontal scrolling issues
- [ ] **Text Readability**: Proper font sizes across devices
- [ ] **Loading Speed**: App loads quickly on mobile networks
- [ ] **Touch Scrolling**: Smooth momentum scrolling

## 🧪 Testing Steps

### Step 1: Basic Layout Test
1. Open `http://localhost:3000`
2. Switch to mobile view (375px width)
3. Verify single-column layout
4. Check header and navigation

### Step 2: Form Interaction Test
1. Add a funnel step
2. Add questions to the step
3. Test dropdown selections
4. Verify input field responsiveness

### Step 3: Data Generation Test
1. Configure a complete funnel
2. Run "Complete Analysis"
3. Check results table scrolling
4. Test tab navigation

### Step 4: Cross-Device Test  
1. Test on actual mobile device via network IP
2. Find local IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)
3. Access `http://[YOUR_IP]:3000` from mobile

### Step 5: Performance Test
1. Chrome DevTools → Network tab
2. Throttle to "Slow 3G"
3. Test loading and interactions

## 🚨 Common Issues to Watch For
- [ ] **Horizontal Overflow**: Any content extending beyond screen width
- [ ] **Tiny Touch Targets**: Buttons or links < 44px
- [ ] **Input Zoom**: Screen zooming when focusing inputs
- [ ] **Broken Layouts**: Components overlapping or misaligned
- [ ] **Slow Loading**: Long delays on mobile networks

## ✅ Success Criteria
- [ ] All layouts adapt smoothly across breakpoints
- [ ] No horizontal scrolling on any screen size
- [ ] All interactive elements are touch-friendly
- [ ] Data tables scroll properly without breaking
- [ ] App remains fully functional on mobile devices

## 📋 Test Results Log
**Date**: ___________  
**Tester**: ___________  
**Devices Tested**: ___________  

**Issues Found**:
- [ ] Issue 1: ___________
- [ ] Issue 2: ___________  
- [ ] Issue 3: ___________

**Overall Mobile Score**: ___/10 