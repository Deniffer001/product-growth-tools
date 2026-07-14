---
type: Reference
title: Google Ads REST operation inventory
description: >
  Generated inventory of pinned Google Ads v24 REST methods and their gkit exposure decisions.
provider: google-ads
inventoryRevision: 2026-07-14.slice4.google-ads.1
---

# Google Ads REST operation inventory

This pinned inventory contains 176 methods: 5 executable and 171 inventory-only.
Inventory-only methods cannot be routed by `gkit google-ads api call`.

| Method | Path | Operation ID | Exposure | Decision |
| --- | --- | --- | --- | --- |
| `POST` | `v24:generateConversionRates` | `googleads.generateConversionRates` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24:listBenchmarksAvailableDates` | `googleads.listBenchmarksAvailableDates` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24:listBenchmarksLocations` | `googleads.listBenchmarksLocations` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24:listBenchmarksProducts` | `googleads.listBenchmarksProducts` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24:listBenchmarksSources` | `googleads.listBenchmarksSources` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24:listPlannableLocations` | `googleads.listPlannableLocations` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24:listPlannableProducts` | `googleads.listPlannableProducts` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24:listPlannableUserInterests` | `googleads.listPlannableUserInterests` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24:listPlannableUserLists` | `googleads.listPlannableUserLists` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+adGroupAd}:removeAutomaticallyCreatedAssets` | `googleads.customers.adGroupAds.removeAutomaticallyCreatedAssets` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+campaignDraft}:promote` | `googleads.customers.campaignDrafts.promote` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+experiment}:endExperiment` | `googleads.customers.experiments.endExperiment` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+experiment}:graduateExperiment` | `googleads.customers.experiments.graduateExperiment` | `inventory` | Not reviewed for executable gkit exposure. |
| `DELETE` | `v24/{+name}` | `googleads.customers.operations.delete` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/{+name}` | `googleads.customers.operations.get` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/{+name}` | `googleads.customers.operations.list` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+name}:cancel` | `googleads.customers.operations.cancel` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+name}:wait` | `googleads.customers.operations.wait` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/{+resourceName}` | `googleads.googleAdsFields.get` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+resourceName}:addOperations` | `googleads.customers.offlineUserDataJobs.addOperations` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+resourceName}:addOperations` | `googleads.customers.batchJobs.addOperations` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/{+resourceName}:getSmartCampaignStatus` | `googleads.customers.smartCampaignSettings.getSmartCampaignStatus` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/{+resourceName}:listAsyncErrors` | `googleads.customers.campaignDrafts.listAsyncErrors` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/{+resourceName}:listExperimentAsyncErrors` | `googleads.customers.experiments.listExperimentAsyncErrors` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/{+resourceName}:listResults` | `googleads.customers.batchJobs.listResults` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+resourceName}:promoteExperiment` | `googleads.customers.experiments.promoteExperiment` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+resourceName}:provideLeadFeedback` | `googleads.customers.localServicesLeads.provideLeadFeedback` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+resourceName}:regenerateShareableLinkId` | `googleads.customers.thirdPartyAppAnalyticsLinks.regenerateShareableLinkId` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+resourceName}:run` | `googleads.customers.offlineUserDataJobs.run` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+resourceName}:run` | `googleads.customers.batchJobs.run` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/{+resourceName}:scheduleExperiment` | `googleads.customers.experiments.scheduleExperiment` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/audienceInsights:listInsightsEligibleDates` | `googleads.audienceInsights.listInsightsEligibleDates` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/customers:listAccessibleCustomers` | `googleads.customers.listAccessibleCustomers` | `executable` | Reviewed adapter, input, read effect, pagination, and response contracts are committed.; capabilities: `google-ads.customers.list-accessible` |
| `POST` | `v24/customers/{+customerId}:createCustomerClient` | `googleads.customers.createCustomerClient` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateAdGroupThemes` | `googleads.customers.generateAdGroupThemes` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateAudienceCompositionInsights` | `googleads.customers.generateAudienceCompositionInsights` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateAudienceDefinition` | `googleads.customers.generateAudienceDefinition` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateAudienceOverlapInsights` | `googleads.customers.generateAudienceOverlapInsights` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateBenchmarksMetrics` | `googleads.customers.generateBenchmarksMetrics` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateCreatorInsights` | `googleads.customers.generateCreatorInsights` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateInsightsFinderReport` | `googleads.customers.generateInsightsFinderReport` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateKeywordForecastMetrics` | `googleads.customers.generateKeywordForecastMetrics` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateKeywordHistoricalMetrics` | `googleads.customers.generateKeywordHistoricalMetrics` | `executable` | Reviewed adapter, input, read effect, pagination, and response contracts are committed.; capabilities: `google-ads.keyword-plan.generate-historical-metrics` |
| `POST` | `v24/customers/{+customerId}:generateKeywordIdeas` | `googleads.customers.generateKeywordIdeas` | `executable` | Reviewed adapter, input, read effect, pagination, and response contracts are committed.; capabilities: `google-ads.keyword-plan.generate-ideas` |
| `POST` | `v24/customers/{+customerId}:generateReachForecast` | `googleads.customers.generateReachForecast` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateShareablePreviews` | `googleads.customers.generateShareablePreviews` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateSuggestedTargetingInsights` | `googleads.customers.generateSuggestedTargetingInsights` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateTargetingSuggestionMetrics` | `googleads.customers.generateTargetingSuggestionMetrics` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:generateTrendingInsights` | `googleads.customers.generateTrendingInsights` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:mutate` | `googleads.customers.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:removeCampaignAutomaticallyCreatedAsset` | `googleads.customers.removeCampaignAutomaticallyCreatedAsset` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:searchAudienceInsightsAttributes` | `googleads.customers.searchAudienceInsightsAttributes` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:startIdentityVerification` | `googleads.customers.startIdentityVerification` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:suggestBrands` | `googleads.customers.suggestBrands` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:suggestKeywordThemes` | `googleads.customers.suggestKeywordThemes` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:suggestSmartCampaignAd` | `googleads.customers.suggestSmartCampaignAd` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:suggestSmartCampaignBudgetOptions` | `googleads.customers.suggestSmartCampaignBudgetOptions` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:suggestTravelAssets` | `googleads.customers.suggestTravelAssets` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:uploadCallConversions` | `googleads.customers.uploadCallConversions` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:uploadClickConversions` | `googleads.customers.uploadClickConversions` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:uploadConversionAdjustments` | `googleads.customers.uploadConversionAdjustments` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}:uploadUserData` | `googleads.customers.uploadUserData` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/accountBudgetProposals:mutate` | `googleads.customers.accountBudgetProposals.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/accountLinks:create` | `googleads.customers.accountLinks.create` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/accountLinks:mutate` | `googleads.customers.accountLinks.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adGroupAdLabels:mutate` | `googleads.customers.adGroupAdLabels.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adGroupAds:mutate` | `googleads.customers.adGroupAds.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adGroupAssets:mutate` | `googleads.customers.adGroupAssets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adGroupAssetSets:mutate` | `googleads.customers.adGroupAssetSets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adGroupBidModifiers:mutate` | `googleads.customers.adGroupBidModifiers.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adGroupCriteria:mutate` | `googleads.customers.adGroupCriteria.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/AdGroupCriterionCustomizers:mutate` | `googleads.customers.AdGroupCriterionCustomizers.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adGroupCriterionLabels:mutate` | `googleads.customers.adGroupCriterionLabels.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adGroupCustomizers:mutate` | `googleads.customers.adGroupCustomizers.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adGroupLabels:mutate` | `googleads.customers.adGroupLabels.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adGroups:mutate` | `googleads.customers.adGroups.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/adParameters:mutate` | `googleads.customers.adParameters.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/ads:mutate` | `googleads.customers.ads.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/assetGenerations:generateImages` | `googleads.customers.assetGenerations.generateImages` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/assetGenerations:generateText` | `googleads.customers.assetGenerations.generateText` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/assetGroupAssets:mutate` | `googleads.customers.assetGroupAssets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/assetGroupListingGroupFilters:mutate` | `googleads.customers.assetGroupListingGroupFilters.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/assetGroups:mutate` | `googleads.customers.assetGroups.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/assetGroupSignals:mutate` | `googleads.customers.assetGroupSignals.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/assets:mutate` | `googleads.customers.assets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/assetSetAssets:mutate` | `googleads.customers.assetSetAssets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/assetSets:mutate` | `googleads.customers.assetSets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/audiences:mutate` | `googleads.customers.audiences.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/batchJobs:mutate` | `googleads.customers.batchJobs.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/biddingDataExclusions:mutate` | `googleads.customers.biddingDataExclusions.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/biddingSeasonalityAdjustments:mutate` | `googleads.customers.biddingSeasonalityAdjustments.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/biddingStrategies:mutate` | `googleads.customers.biddingStrategies.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/billingSetups:mutate` | `googleads.customers.billingSetups.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignAssets:mutate` | `googleads.customers.campaignAssets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignAssetSets:mutate` | `googleads.customers.campaignAssetSets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignBidModifiers:mutate` | `googleads.customers.campaignBidModifiers.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignBudgets:mutate` | `googleads.customers.campaignBudgets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignConversionGoals:mutate` | `googleads.customers.campaignConversionGoals.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignCriteria:mutate` | `googleads.customers.campaignCriteria.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignCustomizers:mutate` | `googleads.customers.campaignCustomizers.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignDrafts:mutate` | `googleads.customers.campaignDrafts.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/CampaignGoalConfigs:mutate` | `googleads.customers.CampaignGoalConfigs.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignGroups:mutate` | `googleads.customers.campaignGroups.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignLabels:mutate` | `googleads.customers.campaignLabels.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignLifecycleGoal:configureCampaignLifecycleGoals` | `googleads.customers.campaignLifecycleGoal.configureCampaignLifecycleGoals` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaigns:enablePMaxBrandGuidelines` | `googleads.customers.campaigns.enablePMaxBrandGuidelines` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaigns:mutate` | `googleads.customers.campaigns.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/campaignSharedSets:mutate` | `googleads.customers.campaignSharedSets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/conversionActions:mutate` | `googleads.customers.conversionActions.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/conversionCustomVariables:mutate` | `googleads.customers.conversionCustomVariables.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/conversionGoalCampaignConfigs:mutate` | `googleads.customers.conversionGoalCampaignConfigs.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/conversionValueRules:mutate` | `googleads.customers.conversionValueRules.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/conversionValueRuleSets:mutate` | `googleads.customers.conversionValueRuleSets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customAudiences:mutate` | `googleads.customers.customAudiences.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customConversionGoals:mutate` | `googleads.customers.customConversionGoals.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerAssets:mutate` | `googleads.customers.customerAssets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerAssetSets:mutate` | `googleads.customers.customerAssetSets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerClientLinks:mutate` | `googleads.customers.customerClientLinks.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerConversionGoals:mutate` | `googleads.customers.customerConversionGoals.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/CustomerCustomizers:mutate` | `googleads.customers.CustomerCustomizers.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerLabels:mutate` | `googleads.customers.customerLabels.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerLifecycleGoal:configureCustomerLifecycleGoals` | `googleads.customers.customerLifecycleGoal.configureCustomerLifecycleGoals` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerManagerLinks:moveManagerLink` | `googleads.customers.customerManagerLinks.moveManagerLink` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerManagerLinks:mutate` | `googleads.customers.customerManagerLinks.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerNegativeCriteria:mutate` | `googleads.customers.customerNegativeCriteria.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerSkAdNetworkConversionValueSchemas:mutate` | `googleads.customers.customerSkAdNetworkConversionValueSchemas.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerUserAccesses:mutate` | `googleads.customers.customerUserAccesses.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customerUserAccessInvitations:mutate` | `googleads.customers.customerUserAccessInvitations.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customInterests:mutate` | `googleads.customers.customInterests.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/customizerAttributes:mutate` | `googleads.customers.customizerAttributes.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/dataLinks:create` | `googleads.customers.dataLinks.create` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/dataLinks:remove` | `googleads.customers.dataLinks.remove` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/dataLinks:update` | `googleads.customers.dataLinks.update` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/experimentArms:mutate` | `googleads.customers.experimentArms.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/experiments:mutate` | `googleads.customers.experiments.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/customers/{+customerId}/getIdentityVerification` | `googleads.customers.getIdentityVerification` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/Goals:mutate` | `googleads.customers.Goals.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/googleAds:mutate` | `googleads.customers.googleAds.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/googleAds:search` | `googleads.customers.googleAds.search` | `executable` | Reviewed adapter, input, read effect, pagination, and response contracts are committed.; capabilities: `google-ads.query.gaql` |
| `POST` | `v24/customers/{+customerId}/googleAds:searchStream` | `googleads.customers.googleAds.searchStream` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/incentives/{+selectedIncentiveId}:applyIncentive` | `googleads.customers.incentives.applyIncentive` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/customers/{+customerId}/invoices` | `googleads.customers.invoices.list` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/keywordPlanAdGroupKeywords:mutate` | `googleads.customers.keywordPlanAdGroupKeywords.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/keywordPlanAdGroups:mutate` | `googleads.customers.keywordPlanAdGroups.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/keywordPlanCampaignKeywords:mutate` | `googleads.customers.keywordPlanCampaignKeywords.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/keywordPlanCampaigns:mutate` | `googleads.customers.keywordPlanCampaigns.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/keywordPlans:mutate` | `googleads.customers.keywordPlans.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/labels:mutate` | `googleads.customers.labels.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/localServices:appendLeadConversation` | `googleads.customers.localServices.appendLeadConversation` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/multiPartyAuthReview:resolve` | `googleads.customers.multiPartyAuthReview.resolve` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/offlineUserDataJobs:create` | `googleads.customers.offlineUserDataJobs.create` | `inventory` | Not reviewed for executable gkit exposure. |
| `GET` | `v24/customers/{+customerId}/paymentsAccounts` | `googleads.customers.paymentsAccounts.list` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/productLinkInvitations:create` | `googleads.customers.productLinkInvitations.create` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/productLinkInvitations:remove` | `googleads.customers.productLinkInvitations.remove` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/productLinkInvitations:update` | `googleads.customers.productLinkInvitations.update` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/productLinks:create` | `googleads.customers.productLinks.create` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/productLinks:remove` | `googleads.customers.productLinks.remove` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/recommendations:apply` | `googleads.customers.recommendations.apply` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/recommendations:dismiss` | `googleads.customers.recommendations.dismiss` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/recommendations:generate` | `googleads.customers.recommendations.generate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/recommendationSubscriptions:mutateRecommendationSubscription` | `googleads.customers.recommendationSubscriptions.mutateRecommendationSubscription` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/remarketingActions:mutate` | `googleads.customers.remarketingActions.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/reservations:bookCampaigns` | `googleads.customers.reservations.bookCampaigns` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/reservations:quoteCampaigns` | `googleads.customers.reservations.quoteCampaigns` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/sharedCriteria:mutate` | `googleads.customers.sharedCriteria.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/sharedSets:mutate` | `googleads.customers.sharedSets.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/smartCampaignSettings:mutate` | `googleads.customers.smartCampaignSettings.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/userListCustomerTypes:mutate` | `googleads.customers.userListCustomerTypes.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/userLists:mutate` | `googleads.customers.userLists.mutate` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/youTubeVideoUploads:create` | `googleads.media.upload` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/youTubeVideoUploads:remove` | `googleads.customers.youTubeVideoUploads.remove` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/customers/{+customerId}/youTubeVideoUploads:update` | `googleads.customers.youTubeVideoUploads.update` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/geoTargetConstants:suggest` | `googleads.geoTargetConstants.suggest` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/googleAdsFields:search` | `googleads.googleAdsFields.search` | `executable` | Reviewed adapter, input, read effect, pagination, and response contracts are committed.; capabilities: `google-ads.fields.describe`, `google-ads.fields.search` |
| `GET` | `v24/incentives:fetchIncentive` | `googleads.incentives.fetchIncentive` | `inventory` | Not reviewed for executable gkit exposure. |
| `POST` | `v24/keywordThemeConstants:suggest` | `googleads.keywordThemeConstants.suggest` | `inventory` | Not reviewed for executable gkit exposure. |
