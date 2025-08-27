// js/utils/productHelpers.js
export const productHelpers = {
    isProductFree(product) {
        return product.is_free || product.price === 0;
    },

    hasDiscount(product) {
        return product.discount_percent > 0;
    },

    getCurrentPrice(product) {
        return product.current_price || product.price;
    },

    formatProductSKU(sku) {
        if (!sku) return 'N/A';
        return sku.toUpperCase().replace(/[^A-Z0-9]/g, '-');
    },

    getProductStatusBadge(product) {
        const badges = [];

        if (this.isProductFree(product)) {
            badges.push({ type: 'free', color: 'green', text: 'FREE' });
        }
        if (product.is_new) {
            badges.push({ type: 'new', color: 'blue', text: 'NEW' });
        }
        if (this.hasDiscount(product)) {
            badges.push({ type: 'discount', color: 'red', text: `-${product.discount_percent}%` });
        }
        if (product.is_featured) {
            badges.push({ type: 'featured', color: 'purple', text: 'FEATURED' });
        }

        return badges;
    },

    calculateDiscountAmount(product) {
        if (!this.hasDiscount(product)) return 0;
        return product.price - this.getCurrentPrice(product);
    },

    isAvailableForUser(product, user) {
        if (this.isProductFree(product)) return true;
        if (user?.subscription && product.requires_subscription) return true;
        if (user?.purchased_products?.includes(product.id)) return true;
        return false;
    },

    sortProducts(products, sortBy, sortOrder = 'asc') {
        const sorted = [...products];

        sorted.sort((a, b) => {
            let valueA, valueB;

            switch(sortBy) {
                case 'price':
                    valueA = this.getCurrentPrice(a);
                    valueB = this.getCurrentPrice(b);
                    break;
                case 'rating':
                    valueA = a.rating || 0;
                    valueB = b.rating || 0;
                    break;
                case 'downloads':
                    valueA = a.downloads_count || 0;
                    valueB = b.downloads_count || 0;
                    break;
                case 'created_at':
                    valueA = new Date(a.created_at).getTime();
                    valueB = new Date(b.created_at).getTime();
                    break;
                default:
                    valueA = a[sortBy];
                    valueB = b[sortBy];
            }

            if (sortOrder === 'desc') {
                return valueB - valueA;
            }
             return valueA - valueB;
       });

       return sorted;
   },

   filterProducts(products, filters) {
       return products.filter(product => {
           if (filters.category && product.category !== filters.category) return false;
           if (filters.product_type && product.product_type !== filters.product_type) return false;
           if (filters.is_free !== null && this.isProductFree(product) !== filters.is_free) return false;
           if (filters.is_new !== null && product.is_new !== filters.is_new) return false;
           if (filters.has_discount !== null && this.hasDiscount(product) !== filters.has_discount) return false;
           if (filters.min_price !== null && this.getCurrentPrice(product) < filters.min_price) return false;
           if (filters.max_price !== null && this.getCurrentPrice(product) > filters.max_price) return false;
           if (filters.search && !this.matchesSearch(product, filters.search)) return false;
           if (filters.tags && !this.matchesTags(product, filters.tags)) return false;

           return true;
       });
   },

   matchesSearch(product, searchQuery) {
       const query = searchQuery.toLowerCase();
       return (
           product.title?.toLowerCase().includes(query) ||
           product.description?.toLowerCase().includes(query) ||
           product.sku?.toLowerCase().includes(query) ||
           product.tags?.some(tag => tag.toLowerCase().includes(query))
       );
   },

   matchesTags(product, tagsFilter) {
       const filterTags = tagsFilter.split(',').map(t => t.trim().toLowerCase());
       return filterTags.some(filterTag =>
           product.tags?.some(productTag =>
               productTag.toLowerCase().includes(filterTag)
           )
       );
   },

   getRelatedProducts(product, allProducts, limit = 4) {
       return allProducts
           .filter(p => p.id !== product.id && (
               p.category === product.category ||
               p.product_type === product.product_type ||
               this.hasCommonTags(p, product)
           ))
           .slice(0, limit);
   },

   hasCommonTags(product1, product2) {
       if (!product1.tags || !product2.tags) return false;
       return product1.tags.some(tag => product2.tags.includes(tag));
   }
};

window.productHelpers = productHelpers;
export default productHelpers;