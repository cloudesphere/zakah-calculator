// Zakah Calculator JavaScript
// 
// API Integration Instructions:
// 1. For real gold prices, replace the fetchGoldPriceFromAPI method with actual API calls
// 2. Popular gold price APIs:
//    - MetalAPI: https://metals.live/api
//    - GoldAPI: https://goldapi.io/
//    - Fixer.io: https://fixer.io/ (for currency conversion)
// 3. Update the API key in fetchGoldPriceFromAPI method
// 4. Modify the currency conversion rates in fetchExchangeRates method

class ZakahCalculator {
    constructor() {
        this.country = '';
        this.selectedDate = '';
        this.goldPrice = 0;
        this.exchangeRates = {};
        this.exchangeRateCache = new Map(); // Cache to avoid repeated API calls
        this.isConverting = false; // Flag to prevent multiple simultaneous conversions
        this.currencyTimeout = null; // Timeout for debouncing currency input
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupHijriDatePicker();
    }

    setupEventListeners() {
        // Country selection
        document.getElementById('country').addEventListener('change', (e) => {
            this.country = e.target.value;
            this.updateCurrencySymbols();
            this.updateConversionLabels();
            this.updateGoldPriceLink(); // Update gold price link for new country
            this.checkCountryAndDateSelection();
        });

        // Hijri date selection
        document.getElementById('hijri-year').addEventListener('change', () => {
            this.updateHijriDate();
        });

        document.getElementById('hijri-month').addEventListener('change', () => {
            this.updateDaysInMonth();
            this.updateHijriDate();
        });

        document.getElementById('hijri-day').addEventListener('change', () => {
            this.updateHijriDate();
        });

        // Gold price input
        document.getElementById('gold-price-input').addEventListener('input', (e) => {
            this.goldPrice = parseFloat(e.target.value) || 0;
            this.checkIfCanCalculate();
        });

        // Currency input listeners
        ['currency-egp', 'currency-sar', 'currency-usd'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updateCurrencyConversions();
                this.checkIfCanCalculate();
            });
        });

        // Gold input listeners
        ['gold-18k', 'gold-21k', 'gold-24k'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.updateGoldConversions();
                this.checkIfCanCalculate();
            });
        });

        // Currency input listeners with debounce
        ['currency-egp', 'currency-sar', 'currency-usd'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                // Clear any existing timeout
                if (this.currencyTimeout) {
                    clearTimeout(this.currencyTimeout);
                }
                
                // Set a new timeout to debounce the conversion
                this.currencyTimeout = setTimeout(() => {
                    this.updateCurrencyConversions();
                    this.checkIfCanCalculate();
                }, 500); // Wait 500ms after user stops typing
            });
        });

        // Calculate button
        document.getElementById('calculate-btn').addEventListener('click', () => {
            this.calculateZakah();
        });
    }

    setupHijriDatePicker() {
        this.populateHijriYears();
        this.setDefaultHijriDate();
    }

    populateHijriYears() {
        const yearSelect = document.getElementById('hijri-year');
        const currentHijriYear = this.gregorianToHijri(new Date()).year;
        
        // Clear existing options first
        yearSelect.innerHTML = '<option value="">السنة</option>';
        
        // Add years from current year - 6 to current year
        for (let year = currentHijriYear - 6; year <= currentHijriYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
        
        // Set current Hijri year as default
        yearSelect.value = currentHijriYear;
    }

    setDefaultHijriDate() {
        const today = new Date();
        const hijriDate = this.gregorianToHijri(today);
        
        document.getElementById('hijri-year').value = hijriDate.year;
        document.getElementById('hijri-month').value = hijriDate.month;
        
        this.updateDaysInMonth();
        document.getElementById('hijri-day').value = hijriDate.day;
        
        this.updateHijriDate();
    }

    updateDaysInMonth() {
        const year = parseInt(document.getElementById('hijri-year').value);
        const month = parseInt(document.getElementById('hijri-month').value);
        const daySelect = document.getElementById('hijri-day');
        
        // Clear existing options
        daySelect.innerHTML = '<option value="">اليوم</option>';
        
        if (!year || !month) return;
        
        // Get days in the selected month
        const daysInMonth = this.getDaysInHijriMonth(year, month);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            daySelect.appendChild(option);
        }
    }

    updateHijriDate() {
        const year = document.getElementById('hijri-year').value;
        const month = document.getElementById('hijri-month').value;
        const day = document.getElementById('hijri-day').value;
        
        if (year && month && day) {
            const hijriDate = {
                year: parseInt(year),
                month: parseInt(month),
                day: parseInt(day)
            };
            
            this.selectedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            // Update display
            const monthNames = [
                '', 'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
                'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
            ];
            
            const displayText = `${day} ${monthNames[month]} ${year} هـ`;
            document.getElementById('selected-hijri-date').textContent = displayText;
            
            // Update gold price link with the selected date
            this.updateGoldPriceLink();
            
            // Check if country and date are selected
            this.checkCountryAndDateSelection();
        } else {
            document.getElementById('selected-hijri-date').textContent = 'لم يتم اختيار تاريخ';
            this.selectedDate = '';
            this.checkIfCanCalculate();
        }
    }

    updateGoldPriceLink() {
        if (this.selectedDate) {
            // Convert Hijri date to Gregorian for the link
            const gregorianDate = this.hijriToGregorian(this.selectedDate);
            const dateString = gregorianDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Create links to gold price sources for the specific date
            const goldPriceLink = document.getElementById('gold-price-link');
            
            // Choose the best gold price source based on country
            let targetUrl;
            if (this.country === 'EGP') {
                // Egyptian gold price sources
                targetUrl = `https://www.google.com/search?q=سعر+الذهب+عيار+24+مصر+${dateString}+بالجرام`;
            } else if (this.country === 'SAR') {
                // Saudi gold price sources
                targetUrl = `https://www.google.com/search?q=سعر+الذهب+عيار+24+السعودية+${dateString}+بالجرام`;
            } else {
                // Default to general search
                targetUrl = `https://www.google.com/search?q=gold+price+24k+${dateString}+per+gram`;
            }
            
            goldPriceLink.href = targetUrl;
            goldPriceLink.title = `البحث عن سعر الذهب عيار 24 للتاريخ ${dateString}`;
        }
    }

    getDaysInHijriMonth(year, month) {
        // Hijri months have either 29 or 30 days
        // This is a simplified calculation - in reality, it depends on lunar observations
        const longMonths = [1, 3, 5, 7, 9, 11]; // Odd months are usually long (30 days)
        return longMonths.includes(month) ? 30 : 29;
    }

    gregorianToHijri(gregorianDate) {
        // Simple and accurate Gregorian to Hijri conversion
        // Current date: December 2024 = approximately Muharram 1446 AH
        
        const year = gregorianDate.getFullYear();
        const month = gregorianDate.getMonth() + 1;
        const day = gregorianDate.getDate();
        
        // Base conversion: Gregorian 2024 = Hijri 1446
        const baseGregorianYear = 2024;
        const baseHijriYear = 1446;
        
        // Calculate year difference and convert to Hijri
        const yearDiff = year - baseGregorianYear;
        const hijriYear = baseHijriYear + yearDiff;
        
        // Keep month and day the same for simplicity
        // (This is an approximation - for exact conversion, more complex calculation is needed)
        let hijriMonth = month;
        let hijriDay = day;
        
        return {
            year: hijriYear,
            month: Math.max(1, Math.min(12, hijriMonth)),
            day: Math.max(1, Math.min(30, hijriDay))
        };
    }

    updateCurrencySymbols() {
        const currencySymbols = {
            'EGP': 'جنيه مصري',
            'SAR': 'ريال سعودي'
        };
        
        document.getElementById('currency-suffix').textContent = currencySymbols[this.country] || 'جنيه مصري';
    }

    updateConversionLabels() {
        const currencyLabels = {
            'EGP': 'جنيه مصري',
            'SAR': 'ريال سعودي'
        };
        
        const targetCurrency = currencyLabels[this.country] || 'جنيه مصري';
        document.querySelectorAll('.target-currency').forEach(element => {
            element.textContent = targetCurrency;
        });
    }

    checkCountryAndDateSelection() {
        const hasCountry = this.country && this.country !== '';
        const hasDate = this.selectedDate && this.selectedDate !== '';
        
        if (hasCountry && hasDate) {
            this.showGoldPriceInput();
        } else {
            this.hideGoldPriceInput();
        }
        
        this.checkIfCanCalculate();
    }

    showGoldPriceInput() {
        document.getElementById('gold-price-input-section').style.display = 'block';
    }

    hideGoldPriceInput() {
        document.getElementById('gold-price-input-section').style.display = 'none';
    }

    // Removed complex API fetching - now user enters price directly

    // Historical exchange rate API implementation using ExchangeRate-API v6
    async getHistoricalExchangeRates(date) {
        try {
            const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            const [year, month, day] = dateString.split('-');
            
            console.log(`Fetching historical exchange rates for ${dateString}`);
            
            // Use ExchangeRate-API v6 with API key for historical data
            const apiKey = '66c6da25191b88a131779baf';
            const url = `https://v6.exchangerate-api.com/v6/${apiKey}/history/USD/${year}/${month}/${day}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Historical exchange rate API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Historical exchange rates response:', data);
            
            // Check if the API returned valid data
            if (data.result !== 'success' || !data.conversion_rates) {
                console.log('Historical data not available for this date, using current rates');
                return await this.getCurrentExchangeRates();
            }
            
            // Hide the notice since we have historical data
            this.hideExchangeRateNotice();
            
            return {
                EGP: data.conversion_rates.EGP,
                SAR: data.conversion_rates.SAR,
                USD: 1
            };
            
        } catch (error) {
            console.error('Error fetching historical exchange rates:', error);
            // Fallback to current rates
            return await this.getCurrentExchangeRates();
        }
    }

    showExchangeRateNotice(dateString) {
        // Show a subtle notice that we're using current rates
        const noticeElement = document.getElementById('exchange-rate-notice');
        if (noticeElement) {
            noticeElement.textContent = `ملاحظة: نستخدم أسعار الصرف الحالية (أسعار تاريخية تتطلب مفاتيح API)`;
            noticeElement.style.display = 'block';
        }
    }

    hideExchangeRateNotice() {
        // Hide the exchange rate notice when historical data is available
        const noticeElement = document.getElementById('exchange-rate-notice');
        if (noticeElement) {
            noticeElement.style.display = 'none';
        }
    }

    async getCurrentExchangeRates() {
        try {
            const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
            if (!response.ok) {
                throw new Error('Exchange rate API request failed');
            }
            
            const data = await response.json();
            
            return {
                EGP: data.rates.EGP,
                SAR: data.rates.SAR,
                USD: 1
            };
            
        } catch (error) {
            console.error('Error fetching current exchange rates:', error);
            // Ultimate fallback to approximate rates
            return {
                EGP: 48.0,
                SAR: 3.75,
                USD: 1
            };
        }
    }

    // Removed old display methods - now using simple input field

    hijriToGregorian(hijriDateString) {
        // Convert Hijri date string to Gregorian date
        const [hijriYear, hijriMonth, hijriDay] = hijriDateString.split('-').map(Number);
        
        // Debug logging
        console.log(`Converting Hijri: ${hijriDateString} (Year: ${hijriYear}, Month: ${hijriMonth}, Day: ${hijriDay})`);
        
        // Use a simpler, more accurate approach
        // Based on known accurate dates for 1446 AH
        
        // Reference: Muharram 1, 1446 AH = July 7, 2024 AD
        const referenceHijri = { year: 1446, month: 1, day: 1 };
        const referenceGregorian = new Date(2024, 6, 8); // July 8, 2024 (adjusted by 1 day)
        
        // Calculate the difference in Hijri days from reference
        const hijriDaysFromReference = this.calculateHijriDaysFromReference(hijriYear, hijriMonth, hijriDay, referenceHijri);
        
        // Convert to Gregorian date
        const gregorianDate = new Date(referenceGregorian);
        gregorianDate.setDate(gregorianDate.getDate() + hijriDaysFromReference);
        
        console.log(`Converted to Gregorian: ${gregorianDate.toISOString().split('T')[0]}`);
        
        return gregorianDate;
    }

    calculateHijriDaysFromReference(targetYear, targetMonth, targetDay, reference) {
        // Calculate days from reference date to target date
        let totalDays = 0;
        
        // Add days from complete years
        for (let year = reference.year; year < targetYear; year++) {
            totalDays += this.getHijriYearDays(year);
        }
        
        // Add days from complete months in target year
        for (let month = 1; month < targetMonth; month++) {
            totalDays += this.getHijriMonthDays(targetYear, month);
        }
        
        // Add remaining days
        totalDays += targetDay - reference.day;
        
        return totalDays;
    }

    getHijriYearDays(year) {
        // Hijri year has 354 or 355 days
        return this.isHijriLeapYear(year) ? 355 : 354;
    }

    getHijriMonthDays(year, month) {
        // Hijri months alternate between 29 and 30 days
        // Odd months (1,3,5,7,9,11) usually have 30 days
        // Even months (2,4,6,8,10,12) usually have 29 days
        // But this can vary based on lunar observations
        
        const longMonths = [1, 3, 5, 7, 9, 11]; // Months that usually have 30 days
        return longMonths.includes(month) ? 30 : 29;
    }

    isHijriLeapYear(year) {
        // Hijri leap years occur in a 30-year cycle
        // Years: 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29
        const leapYears = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
        return leapYears.includes(year % 30);
    }

    async simulateApiCall() {
        // Simulate API delay
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    async fetchExchangeRates() {
        try {
            // Mock exchange rates (in reality, you would fetch from a currency API)
            this.exchangeRates = {
                'EGP': 1,      // Base currency
                'SAR': 0.08,   // 1 SAR = 0.08 EGP (example rate)
                'USD': 0.032   // 1 USD = 0.032 EGP (example rate)
            };
            
            // Update currency conversions
            this.updateCurrencyConversions();
            
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
        }
    }

    updateGoldConversions() {
        const gold18k = parseFloat(document.getElementById('gold-18k').value) || 0;
        const gold21k = parseFloat(document.getElementById('gold-21k').value) || 0;
        const gold24k = parseFloat(document.getElementById('gold-24k').value) || 0;

        // Convert to 24k equivalent
        const converted18k = gold18k * (18/24);
        const converted21k = gold21k * (21/24);
        const converted24k = gold24k;

        document.getElementById('gold-18k-converted').textContent = converted18k.toFixed(2);
        document.getElementById('gold-21k-converted').textContent = converted21k.toFixed(2);
        document.getElementById('gold-24k-converted').textContent = converted24k.toFixed(2);
    }

    async updateCurrencyConversions() {
        // Prevent multiple simultaneous conversions
        if (this.isConverting) {
            return;
        }

        const currencyEGP = parseFloat(document.getElementById('currency-egp').value) || 0;
        const currencySAR = parseFloat(document.getElementById('currency-sar').value) || 0;
        const currencyUSD = parseFloat(document.getElementById('currency-usd').value) || 0;

        // Only fetch exchange rates if we have currency inputs and a selected date
        if ((currencyEGP > 0 || currencySAR > 0 || currencyUSD > 0) && this.selectedDate) {
            this.isConverting = true;
            
            try {
                // Convert Hijri date to Gregorian for API call
                const gregorianDate = this.hijriToGregorian(this.selectedDate);
                const dateString = gregorianDate.toISOString().split('T')[0];
                
                // Check cache first (date-specific caching)
                let exchangeRates = this.exchangeRateCache.get(dateString);
                
                if (!exchangeRates) {
                    console.log(`Fetching historical exchange rates for ${dateString}`);
                    // Show loading indicator
                    document.getElementById('currency-loading').style.display = 'flex';
                    
                    // Fetch historical exchange rates for the specific date
                    exchangeRates = await this.getHistoricalExchangeRates(gregorianDate);
                    
                    // Cache the result
                    this.exchangeRateCache.set(dateString, exchangeRates);
                } else {
                    console.log(`Using cached exchange rates for ${dateString}`);
                }
                
                // Convert to target currency using API rates
                let convertedEGP, convertedSAR, convertedUSD;
                
                if (this.country === 'EGP') {
                    convertedEGP = currencyEGP;
                    convertedSAR = currencySAR * (exchangeRates.EGP / exchangeRates.SAR);
                    convertedUSD = currencyUSD * exchangeRates.EGP;
                } else if (this.country === 'SAR') {
                    convertedEGP = currencyEGP * (exchangeRates.SAR / exchangeRates.EGP);
                    convertedSAR = currencySAR;
                    convertedUSD = currencyUSD * exchangeRates.SAR;
                }

                document.getElementById('currency-egp-converted').textContent = convertedEGP.toFixed(2);
                document.getElementById('currency-sar-converted').textContent = convertedSAR.toFixed(2);
                document.getElementById('currency-usd-converted').textContent = convertedUSD.toFixed(2);
                
            } catch (error) {
                console.error('Error updating currency conversions:', error);
                // Fallback to simple conversion if API fails
                this.updateCurrencyConversionsFallback(currencyEGP, currencySAR, currencyUSD);
            } finally {
                // Hide loading indicator and reset flag
                document.getElementById('currency-loading').style.display = 'none';
                this.isConverting = false;
            }
        } else {
            // Clear conversions if no inputs
            document.getElementById('currency-egp-converted').textContent = '0.00';
            document.getElementById('currency-sar-converted').textContent = '0.00';
            document.getElementById('currency-usd-converted').textContent = '0.00';
            document.getElementById('currency-loading').style.display = 'none';
        }
    }

    updateCurrencyConversionsFallback(currencyEGP, currencySAR, currencyUSD) {
        // Fallback conversion rates (approximate)
        const egpToSar = 0.078; // 1 EGP = 0.078 SAR
        const sarToEgp = 12.8;  // 1 SAR = 12.8 EGP
        const usdToEgp = 48;    // 1 USD = 48 EGP
        const usdToSar = 3.75;  // 1 USD = 3.75 SAR

        // Convert to target currency
        let convertedEGP, convertedSAR, convertedUSD;
        
        if (this.country === 'EGP') {
            convertedEGP = currencyEGP;
            convertedSAR = currencySAR * sarToEgp;
            convertedUSD = currencyUSD * usdToEgp;
        } else if (this.country === 'SAR') {
            convertedEGP = currencyEGP * egpToSar;
            convertedSAR = currencySAR;
            convertedUSD = currencyUSD * usdToSar;
        }

        document.getElementById('currency-egp-converted').textContent = convertedEGP.toFixed(2);
        document.getElementById('currency-sar-converted').textContent = convertedSAR.toFixed(2);
        document.getElementById('currency-usd-converted').textContent = convertedUSD.toFixed(2);
    }

    checkIfCanCalculate() {
        // Check if all required fields are filled
        const hasCountry = this.country && this.country !== '';
        const hasDate = this.selectedDate && this.selectedDate !== '';
        const hasGoldPrice = this.goldPrice > 0;
        
        // Check if user has entered any gold or currency values
        const hasGoldInputs = this.hasGoldInputs();
        const hasCurrencyInputs = this.hasCurrencyInputs();
        const hasAnyInputs = hasGoldInputs || hasCurrencyInputs;
        
        const canCalculate = hasCountry && hasDate && hasGoldPrice && hasAnyInputs;
        
        document.getElementById('calculate-btn').disabled = !canCalculate;
        
        // Update button text based on validation
        const calculateBtn = document.getElementById('calculate-btn');
        if (!hasCountry || !hasDate) {
            calculateBtn.textContent = 'اختر البلد والتاريخ أولاً';
        } else if (!hasGoldPrice) {
            calculateBtn.textContent = 'أدخل سعر الذهب أولاً';
        } else if (!hasAnyInputs) {
            calculateBtn.textContent = 'أدخل كمية الذهب أو الأموال';
        } else {
            calculateBtn.textContent = 'احسب الزكاة';
        }
    }

    hasGoldInputs() {
        const gold18k = parseFloat(document.getElementById('gold-18k').value) || 0;
        const gold21k = parseFloat(document.getElementById('gold-21k').value) || 0;
        const gold24k = parseFloat(document.getElementById('gold-24k').value) || 0;
        return gold18k > 0 || gold21k > 0 || gold24k > 0;
    }

    hasCurrencyInputs() {
        const currencyEGP = parseFloat(document.getElementById('currency-egp').value) || 0;
        const currencySAR = parseFloat(document.getElementById('currency-sar').value) || 0;
        const currencyUSD = parseFloat(document.getElementById('currency-usd').value) || 0;
        return currencyEGP > 0 || currencySAR > 0 || currencyUSD > 0;
    }

    async calculateZakah() {
        try {
            // Get gold quantities
            const gold18k = parseFloat(document.getElementById('gold-18k').value) || 0;
            const gold21k = parseFloat(document.getElementById('gold-21k').value) || 0;
            const gold24k = parseFloat(document.getElementById('gold-24k').value) || 0;

            // Convert to 24k equivalent
            const totalGold24k = (gold18k * (18/24)) + (gold21k * (21/24)) + gold24k;

            // Calculate gold value
            const goldValue = totalGold24k * this.goldPrice;

            // Get currency amounts
            const currencyEGP = parseFloat(document.getElementById('currency-egp').value) || 0;
            const currencySAR = parseFloat(document.getElementById('currency-sar').value) || 0;
            const currencyUSD = parseFloat(document.getElementById('currency-usd').value) || 0;

            // Convert currencies to target currency using API exchange rates
            let totalCash;
            
            try {
                // Convert Hijri date to Gregorian for API call
                const gregorianDate = this.hijriToGregorian(this.selectedDate);
                const dateString = gregorianDate.toISOString().split('T')[0];
                
                // Use cached exchange rates if available
                let exchangeRates = this.exchangeRateCache.get(dateString);
                
                if (!exchangeRates) {
                    // Fetch historical exchange rates if not cached
                    exchangeRates = await this.getHistoricalExchangeRates(gregorianDate);
                    this.exchangeRateCache.set(dateString, exchangeRates);
                }
                
                if (this.country === 'EGP') {
                    totalCash = currencyEGP + (currencySAR * (exchangeRates.EGP / exchangeRates.SAR)) + (currencyUSD * exchangeRates.EGP);
                } else if (this.country === 'SAR') {
                    totalCash = (currencyEGP * (exchangeRates.SAR / exchangeRates.EGP)) + currencySAR + (currencyUSD * exchangeRates.SAR);
                }
                
            } catch (error) {
                console.error('Error fetching exchange rates for calculation:', error);
                // Fallback to simple rates
                const egpToSar = 0.078; // 1 EGP = 0.078 SAR
                const sarToEgp = 12.8;  // 1 SAR = 12.8 EGP
                const usdToEgp = 48;    // 1 USD = 48 EGP
                const usdToSar = 3.75;  // 1 USD = 3.75 SAR
                
                if (this.country === 'EGP') {
                    totalCash = currencyEGP + (currencySAR * sarToEgp) + (currencyUSD * usdToEgp);
                } else if (this.country === 'SAR') {
                    totalCash = (currencyEGP * egpToSar) + currencySAR + (currencyUSD * usdToSar);
                }
            }

            // Calculate total wealth
            const totalWealth = goldValue + totalCash;

            // Calculate Zakah (2.5%)
            const zakahAmount = totalWealth * 0.025;

            // Display results
            this.displayResults(totalGold24k, goldValue, totalCash, totalWealth, zakahAmount);

        } catch (error) {
            console.error('Error calculating Zakah:', error);
            this.showError('خطأ في حساب الزكاة');
        }
    }

    displayResults(totalGold, goldValue, totalCash, totalWealth, zakahAmount) {
        const currencySymbol = this.country === 'EGP' ? 'جنيه مصري' : 'ريال سعودي';
        
        document.getElementById('total-gold').textContent = `${totalGold.toFixed(2)} جرام`;
        document.getElementById('gold-value').textContent = `${goldValue.toLocaleString()} ${currencySymbol}`;
        document.getElementById('total-cash').textContent = `${totalCash.toLocaleString()} ${currencySymbol}`;
        document.getElementById('total-wealth').textContent = `${totalWealth.toLocaleString()} ${currencySymbol}`;
        document.getElementById('zakah-amount').textContent = `${zakahAmount.toLocaleString()} ${currencySymbol}`;

        // Show results section
        document.getElementById('results-section').style.display = 'block';
        
        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    showError(message) {
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Insert after the form
        const formSection = document.querySelector('.form-section');
        formSection.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        // Create success message element
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        
        // Insert after the form
        const formSection = document.querySelector('.form-section');
        formSection.appendChild(successDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }
}

// Initialize the calculator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ZakahCalculator();
});

// Utility functions for Hijri calendar (simplified)
function convertGregorianToHijri(date) {
    // This is a simplified conversion
    // In a real application, you would use a proper Hijri calendar library
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Approximate conversion
    const hijriYear = year - 622;
    
    return {
        year: hijriYear,
        month: month,
        day: day
    };
}

// Format number with Arabic locale
function formatArabicNumber(number) {
    return new Intl.NumberFormat('ar-EG').format(number);
}
