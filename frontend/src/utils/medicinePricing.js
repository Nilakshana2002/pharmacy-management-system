/**
 * Unified Pharmacy Medicine Pricing Engine
 * Handles promotional offers, percentage discounts, deductions, and customer final prices.
 * Supports both MySQL relational database format and mock wellness catalog objects.
 */

export function getMedicinePricing(medicine) {
  if (!medicine) {
    return {
      isPublic: false,
      isOffer: false,
      regularPrice: 0,
      finalPrice: 0,
      discountPercent: 0,
      discountDeduction: 0,
      formattedFinalPrice: '0.00',
      formattedRegularPrice: '0.00',
      formattedDiscountDeduction: '0.00'
    };
  }

  const isPublic = medicine.is_public_price !== undefined ? Boolean(medicine.is_public_price) : true;
  const isOffer = Boolean(medicine.is_offer) && Number(medicine.discount_percent) > 0;
  const discountPercent = isOffer ? Number(medicine.discount_percent) : 0;

  let regularPrice = 0;
  let finalPrice = 0;

  // Case A: Backend explicitly provides both original_price and final_price
  if (medicine.final_price !== undefined && medicine.original_price !== undefined && medicine.original_price !== null) {
    regularPrice = Number(medicine.original_price) || 0;
    finalPrice = isOffer ? (Number(medicine.final_price) || 0) : regularPrice;
  } 
  // Case B: Mock wellnessCatalog structure where unit_price was pre-discounted and original_price was separate
  else if (medicine.original_price && Number(medicine.original_price) > Number(medicine.unit_price)) {
    regularPrice = Number(medicine.original_price);
    finalPrice = isOffer ? Number(medicine.unit_price) : regularPrice;
  } 
  // Case C: Standard MySQL Database model where unit_price is the official regular counter price
  else {
    regularPrice = Number(medicine.unit_price || medicine.original_price || 0);
    if (isOffer && discountPercent > 0) {
      finalPrice = Number((regularPrice * (1.0 - (discountPercent / 100.0))).toFixed(2));
    } else {
      finalPrice = regularPrice;
    }
  }

  // Ensure calculations are never negative
  finalPrice = Math.max(0, finalPrice);
  regularPrice = Math.max(0, regularPrice);

  const discountDeduction = isOffer 
    ? Math.max(0, Number((regularPrice - finalPrice).toFixed(2))) 
    : 0;

  return {
    isPublic,
    isOffer,
    regularPrice,
    finalPrice,
    discountPercent,
    discountDeduction,
    formattedFinalPrice: finalPrice.toFixed(2),
    formattedRegularPrice: regularPrice.toFixed(2),
    formattedDiscountDeduction: discountDeduction.toFixed(2)
  };
}
