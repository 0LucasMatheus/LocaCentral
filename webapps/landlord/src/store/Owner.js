import { action, computed, flow, makeObservable, observable } from 'mobx';

import { apiFetcher } from '../utils/fetch';
import { updateItems } from './utils';

export default class Owner {
  constructor() {
    this.selected = {};
    this.filters = { searchText: '' };
    this.items = [];

    makeObservable(this, {
      selected: observable,
      filters: observable,
      items: observable,
      filteredItems: computed,
      setSelected: action,
      setFilters: action,
      fetch: flow,
      fetchOne: flow,
      create: flow,
      update: flow,
      delete: flow
    });
  }

  get filteredItems() {
    let filteredItems = this.items;

    if (this.filters.searchText) {
      const regExp = /\s|\.|-/gi;
      const cleanedSearchText = this.filters.searchText
        .toLowerCase()
        .replace(regExp, '');

      filteredItems = filteredItems.filter(({ name, cpf, cnpj, email, phone }) => {
        let found =
          name.replace(regExp, '').toLowerCase().indexOf(cleanedSearchText) !== -1;

        if (!found && cpf) {
          found = cpf.replace(regExp, '').indexOf(cleanedSearchText) !== -1;
        }

        if (!found && cnpj) {
          found = cnpj.replace(regExp, '').indexOf(cleanedSearchText) !== -1;
        }

        if (!found && email) {
          found = email.toLowerCase().indexOf(cleanedSearchText) !== -1;
        }

        if (!found && phone) {
          found = phone.replace(regExp, '').indexOf(cleanedSearchText) !== -1;
        }

        return found;
      });
    }

    return filteredItems;
  }

  setSelected = (owner) => (this.selected = owner);

  setFilters = ({ searchText = '' }) => (this.filters = { searchText });

  *fetch() {
    try {
      const response = yield apiFetcher().get('/owners');
      this.items = response.data;
      if (this.selected._id) {
        this.setSelected(
          this.items.find((item) => item._id === this.selected._id) || {}
        );
      }
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *fetchOne(ownerId) {
    try {
      const response = yield apiFetcher().get(`/owners/${ownerId}`);
      const updatedOwner = response.data;
      this.items = updateItems(updatedOwner, this.items);
      if (this.selected?._id === updatedOwner._id) {
        this.setSelected(updatedOwner);
      }
      return { status: 200, data: updatedOwner };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *create(owner) {
    try {
      const response = yield apiFetcher().post('/owners', owner);
      const createdOwner = response.data;
      this.items = updateItems(createdOwner, this.items);
      return { status: 200, data: createdOwner };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *update(owner) {
    try {
      const response = yield apiFetcher().put(`/owners/${owner._id}`, owner);
      const updatedOwner = response.data;
      this.items = updateItems(updatedOwner, this.items);
      if (this.selected?._id === updatedOwner._id) {
        this.setSelected(updatedOwner);
      }
      return { status: 200, data: updatedOwner };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *delete(id) {
    try {
      yield apiFetcher().delete(`/owners/${id}`);
      this.items = this.items.filter((item) => item._id !== id);
      if (this.selected?._id === id) {
        this.setSelected({});
      }
      return { status: 200 };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }
}
