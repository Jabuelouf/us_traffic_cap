/**
 * US Traffic Accident Analysis - Chart Data
 * All data extracted from notebook analysis
 * Version: 2 - Weather charts reordered for clarity
 */

const CHART_DATA = {
    // Slide 4 - Temporal Patterns
    hourly: {
        labels: ['5AM', '6AM', '7AM', '8AM', '9AM', '12PM', '3PM', '4PM', '5PM', '6PM', '9PM'],
        values: [209579, 375179, 546789, 541643, 334067, 316904, 463389, 520177, 516626, 390621, 169500],
        label: 'Accidents by Hour'
    },

    monthly: {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        values: [652682, 585606, 501362, 526210, 505614, 524750, 463263, 547206, 593815, 630325, 695612, 758783],
        label: 'Accidents by Month'
    },

    // Slide 6 - Weather & Severity
    // Default order: sorted by value (descending)
    weatherSeverity: {
        labels: ['Rain', 'Cloudy', 'Snow/Ice', 'Fair', 'Wind/Dust', 'Other', 'Fog/Haze'],
        values: [23.5, 21.7, 19.5, 16.9, 16.5, 16.3, 16.2],
        label: 'Severe Rate',
        hoverOrder: [0, 2, 6, 3, 1, 4, 5] // Rain, Snow/Ice, Fog/Haze, Fair, Cloudy, Wind/Dust, Other
    },

    weatherVolume: {
        labels: ['Fair', 'Cloudy', 'Rain', 'Fog/Haze', 'Snow/Ice', 'Other', 'Wind/Dust'],
        values: [3405216, 3163750, 544945, 202399, 173605, 61753, 3267],
        label: 'Total Accidents',
        hoverOrder: [0, 1, 2, 3, 4, 5, 6] // Fair, Cloudy, Rain, Fog/Haze, Snow/Ice, Other, Wind/Dust (same as default)
    },

    // Slide 8 - Geographic Concentration
    topStates: {
        labels: ['CA', 'FL', 'TX', 'SC', 'NY', 'NC', 'VA', 'PA', 'MN', 'OR'],
        values: [1741433, 880192, 582837, 382557, 347960, 338199, 303301, 296620, 192084, 179660],
        label: 'Accidents by State'
    },

    topCities: {
        labels: ['Miami, FL', 'Houston, TX', 'Los Angeles, CA', 'Charlotte, NC', 'Dallas, TX', 'Orlando, FL', 'Austin, TX', 'Raleigh, NC', 'Nashville, TN', 'Baton Rouge, LA'],
        values: [186768, 169428, 156491, 138345, 130303, 109690, 96604, 86066, 72670, 71588],
        label: 'Accidents by City'
    },

    // Key Statistics
    stats: {
        totalRecords: 7728394,
        totalStates: 49,
        dateRange: '2016-2023',
        peakHourPercent: 33.5,
        rainSevereRate: 23.5,
        adverseSevereRate: 21.16,
        fairSevereRate: 16.91,
        adverseVsFairRelativeRisk: 1.252,
        topStatesPercent: 50.9,
        targetReduction: 20,
        accidentsPrevented: 118000
    },

    // Slide 9 - Map Data for Tier 1 States and Tier 2 Cities
    mapData: {
        tier1States: {
            CA: {
                name: 'California',
                accidents: 1741433,
                percent: '22.5%',
                investment: '$139M-$279M',
                prevented: '7,900-10,100'
            },
            FL: {
                name: 'Florida',
                accidents: 880192,
                percent: '11.4%',
                investment: '$70M-$141M',
                prevented: '4,000-5,100'
            },
            TX: {
                name: 'Texas',
                accidents: 582837,
                percent: '7.5%',
                investment: '$47M-$93M',
                prevented: '2,600-3,400'
            },
            SC: {
                name: 'South Carolina',
                accidents: 382557,
                percent: '4.9%',
                investment: '$31M-$61M',
                prevented: '1,700-2,200'
            },
            NY: {
                name: 'New York',
                accidents: 347960,
                percent: '4.5%',
                investment: '$28M-$56M',
                prevented: '1,600-2,000'
            }
        },
        tier2Cities: {
            miami: {
                name: 'Miami',
                state: 'FL',
                accidents: 186768,
                coords: [-80.1918, 25.7617],
                program: 'Adaptive traffic control',
                investment: '$18M-$44M'
            },
            houston: {
                name: 'Houston',
                state: 'TX',
                accidents: 169428,
                coords: [-95.3698, 29.7604],
                program: 'Real-time monitoring',
                investment: '$17M-$42M'
            },
            losAngeles: {
                name: 'Los Angeles',
                state: 'CA',
                accidents: 156491,
                coords: [-118.2437, 34.0522],
                program: 'Dynamic message signs',
                investment: '$16M-$39M'
            },
            charlotte: {
                name: 'Charlotte',
                state: 'NC',
                accidents: 138345,
                coords: [-80.8431, 35.2271],
                program: 'Weather-responsive speed mgmt',
                investment: '$14M-$35M'
            },
            dallas: {
                name: 'Dallas',
                state: 'TX',
                accidents: 130303,
                coords: [-96.7970, 32.7767],
                program: 'Adaptive traffic control',
                investment: '$13M-$33M'
            }
        }
    },

    // Slide 10 - Timeline Milestones
    timeline: [
        {
            period: 'Q1 2026',
            phase: 'Immediate Actions',
            items: [
                'Secure HSIP funding for intersection audits',
                'Deploy RWIS monitoring in top states',
                'Initiate traffic management planning',
                'Establish project governance'
            ]
        },
        {
            period: 'Q2 2026',
            phase: 'Baseline & Launch',
            items: [
                'Establish metrics for all three programs',
                'Complete safety audits (20 metros)',
                'Launch weather alert systems',
                'Finalize pilot site selection'
            ]
        },
        {
            period: 'Q3-Q4 2026',
            phase: 'Pilot Programs',
            items: [
                'Traffic management: 3 metros',
                'Weather protocols: High-risk corridors',
                'Intersection improvements: Priority sites',
                'Begin monthly progress tracking'
            ]
        },
        {
            period: '2027-2028',
            phase: 'Scaling Phase',
            items: [
                'Traffic systems: Expand to 10 corridors',
                'Weather infrastructure: Tier 1 states',
                'Intersections: Top 20 metros complete',
                'Quarterly effectiveness reviews'
            ]
        },
        {
            period: 'Year 5 (2030)',
            phase: 'Impact Target',
            items: [
                '20% aggregate accident reduction',
                '115,000+ accidents prevented annually',
                'Measurable severity improvements',
                'ROI validation across programs'
            ],
            isTarget: true
        },
        {
            period: '2029-2033',
            phase: 'Mature Operations',
            items: [
                'Full program deployment',
                'Secondary market expansion',
                'Technology integration (AI, connected vehicles)',
                'Continuous optimization'
            ]
        },
        {
            period: '2034+',
            phase: 'Long-term Evolution',
            items: [
                'Nationwide coverage achieved',
                'Advanced predictive systems',
                'Autonomous vehicle integration',
                'Next-generation infrastructure'
            ]
        }
    ]
};
