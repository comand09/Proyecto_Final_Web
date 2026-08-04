// Quotes feature service. Wraps the shared ApiClient for quote-specific
// operations (create + select result).
import { Injectable, inject } from "@angular/core";
import { ApiClient } from "../../../core/services/api-client";
import { Quote, QuoteResult, QuoteInput } from "../../../core/models/shipcore.models";

@Injectable({ providedIn: "root" })
export class QuotesService {
  private api = inject(ApiClient);

  createQuote(input: QuoteInput): Quote | null {
    return this.api.createQuote(input);
  }

  listQuotes(): Quote[] {
    return this.api.listQuotes().items;
  }

  selectResult(quoteId: string, resultId: string): Quote | null {
    return this.api.selectQuoteResult(quoteId, resultId);
  }

  getQuote(quoteId: string): Quote | null {
    return this.api.getQuote(quoteId);
  }

  getResults(quoteId: string): QuoteResult[] {
    return this.api.getQuoteResults(quoteId);
  }
}
