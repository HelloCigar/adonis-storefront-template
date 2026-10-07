export const policies = {
  AccountAddressPolicy: () => import('#policies/account/address_policy'),
  AccountOrderPolicy: () => import('#policies/account/order_policy'),
  AccountUserPolicy: () => import('#policies/account/user_policy'),
  ChatOrderPolicy: () => import('#policies/chat/order_policy'),
  SellerAccessPolicy: () => import('#policies/seller/access_policy'),
  SellerCollectionPolicy: () => import('#policies/seller/collection_policy'),
  SellerImagePolicy: () => import('#policies/seller/image_policy'),
  SellerOrderPolicy: () => import('#policies/seller/order_policy'),
  SellerProductPolicy: () => import('#policies/seller/product_policy'),
  SellerUserPolicy: () => import('#policies/seller/user_policy'),
  SellerVariantPolicy: () => import('#policies/seller/variant_policy'),
}

