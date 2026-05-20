#!/usr/bin/env python
# coding: utf-8

# In[1]:


import pandas as pd

RAW_FILES = [
    "hdc_merged_long_2567.csv",
    "hdc_merged_long_2568.csv",
    "hdc_merged_long_2569.csv",
]

hdc = pd.concat([pd.read_csv(file) for file in RAW_FILES], ignore_index=True)

hdc.to_csv("hdc.csv", index=False, encoding="utf-8-sig")
hdc.to_parquet(
    "hdc.parquet",
    index=False,
    engine="pyarrow"
)

print("Export completed: hdc.csv, hdc.parquet")
print("Shape:", hdc.shape)


# In[ ]:




