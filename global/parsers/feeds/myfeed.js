class MyFeed {
    constructor(products) {
      // feed settings, change to your needs or get from settings in API
      this.settings = {
        locale: 'sv',
        language: 'sv',
        country: 'SE',
        currency: 'SEK',
        market: 1,
        maxCategoryDepth: 4,
        onlyIncludeProductsInStock: true,
        allowSalePrice: true,
        descriptionField: 'ShortTexts',
      };
      // build feed products
      this.feedProducts = this.buildProducts(products);
    }

    buildProducts(products) {
      let feedObj = [];
      // loop through products
      for (const product of products) {
        // set product vars
        const url = this.getUrl(product);
        // if no url, skip product
        if(!url) {
          continue;
        }

        const priceRegular = this.getPriceRegular(product);
        // if no price, skip product
        if(!priceRegular) {
          continue;
        }

        const priceSale = this.settings.allowSalePrice ? this.getPriceSale(product, priceRegular.PriceIncVat): null;
        const title = this.getLocalizedValue(product.Names, this.settings.locale);
        const decriptionField = product[this.settings.descriptionField];        
        const description = this.cleanString(this.removeHtmlTags(this.getLocalizedValue(decriptionField, this.settings.locale)));
        const googleProductCategory = this.getCategoryPath(product.MainCategoryId, product);
        const brand = product.BrandName?.trim('-');
        const image = product.Images.slice().sort((a, b) => a.Order - b.Order)[0];
        const additionalImage = product.Images.slice().sort((a, b) => a.Order - b.Order).find(i => i !== image);
        
        // loop through items and add product for each item
        for (const item of product.Items) {
          const ignoreMpn = !item.ArticleNumber;
          const productObj = {
            id: product.ProductId,
            title: title,
            description: description,
            link: url,
            imageLink: image ? image.Url : '',
            additionalImageLink: additionalImage ? additionalImage.Url : '',
            condition: 'new',
            availability: this.getStockStatus(item),
            price: priceRegular ? `${priceRegular.PriceIncVat.toFixed(2)} ${priceRegular.Currency}` : '',
            priceSale: priceSale ? `${priceSale.PriceIncVat.toFixed(2)} ${priceSale.Currency}` : '',
            brand: brand,
            gtin: item.Gtin,
            mpn: item.ArticleNumber || product.ArticleNumber,
            googleProductCategory: googleProductCategory || '',
          }
          feedObj.push(productObj);
        }
      }
      return feedObj;
    }

    generateFeed() {
      let feed = '';
      if(!this.feedProducts) {
          return feed;
      }
      // Add header row
      feed += 'id\ttitle\tdescription\tlink\timage_link\tcondition\tavailability\tprice\tbrand\tgtin\tmpn\tgoogle_product_category\n';
  
      // Add data rows
      for (const product of this.feedProducts) {
        const {
          id,
          title,
          description,
          link,
          imageLink,
          condition,
          availability,
          price,
          brand,
          gtin,
          mpn,
          googleProductCategory
        } = product;

        // add row to feed
        feed += `${id}\t${title}\t${description}\t${link}\t${imageLink}\t${condition}\t${availability}\t${price}\t${brand}\t${gtin}\t${mpn}\t${googleProductCategory}\n`;
      }
      return feed;
    }

    // get url
    getUrl(product) {
      const url = product.Urls.find(u => u.Market === this.settings.market 
        && u.Language.toLowerCase() === this.settings.language.toLowerCase());
      if(!url) {
        return;
      }
      return url.Url;
    }

    // get regular price
    getPriceRegular(product) {
      const price = product.Prices.find(p => p.PriceListId === (this.settings.market * 1000000)
        && p.Country.toLowerCase() === this.settings.country.toLowerCase()
        && p.Currency.toLowerCase() === this.settings.currency.toLowerCase());
      if(!price) {
        return;
      }
      return price;
    }

    // get sale price
    getPriceSale(product, priceRegular) {
      const price = product.Prices.find(p => p.PriceListId >= (this.settings.Market * 1000000 + 1)
        && p.PriceListId < ((this.settings.market + 1) * 1000000)
        && p.PriceIncVat < priceRegular
        && p.Country.toLowerCase() === country.toLowerCase()
        && p.Currency.toLowerCase() === currency.toLowerCase());
      if(!price) {
        return;
      }
      return price;
    }

    // get category path
    getCategoryPath(categoryId, product, pathSoFar = null, iteration = 0) {
      if (iteration >= this.settings.maxCategoryDepth) {
        return pathSoFar;
      }
      const category = product.Categories.find(c => c.CategoryId === categoryId);
      if (category) {
        const categoryName = category.Names.find(c => c.LanguageCode.toLowerCase() === this.settings.language.toLowerCase())?.Content;
        const newPath = !pathSoFar ? categoryName : `${categoryName} > ${pathSoFar}`;
        return this.getCategoryPath(category.ParentCategoryId ?? 0, product, newPath, iteration + 1);
      }
      return pathSoFar;
    }
    
    // get stock status
    getStockStatus(item) {
      if(!item.Stock.StockSellable) {
        return 'out of stock';
      }
      return item.Stock.StockSellable > 0 ? 'in stock' : 'out of stock';
    }

    // get localized value from array of values
    getLocalizedValue(values, locale) {
      if(!values) {
        return '';
      }
      for (const value of values) {
        if(value.LanguageCode === locale) {
          return value.Content;
        }
      }
      return '';
    }

    // remove html tags from string
    removeHtmlTags(str) {
      return str.replace(/(<([^>]+)>)/ig, '');
    }

    // remove line breaks and tabs from string
    cleanString(str) {
      return str.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\t/g, ' ');
    }
  }
  module.exports = MyFeed;