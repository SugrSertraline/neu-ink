# A Multi-Level Sentiment Analysis Framework for Financial Texts

Yiwei Liu $^{1,3,*}$ , Junbo Wang $^{1}$ , Lei Long $^{1}$ , Xin Li $^{1}$ , Ruiting Ma $^{1}$ , Yuankai Wu $^{1}$ , Xuebin Chen $^{1,2,*}$

$^{1}$ Sichuan University,  $^{2}$ Fudan University,  $^{3}$ National University of Singapore

1. How can the performance of a specific bond be quantified from textual data?  
2. How does the performance of an industry transmit to bonds?  
3. How to take into account the latency and persistence of textual impact?

# NEWSPAPER

Firm 1 Firm 2 Industry 1 Industry 2

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/b11e379116ad077aceaa1bf65aed8d4e2beff44ed191f4d5e97c8deec07e8ca4.jpg)

# Multi-Level Sentiment Analysis

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/8d6e0471d579bbedc446d07b1b4d21186493bf19839ed47968ca85453b1e6d5e.jpg)

Firm-Specific

Industry-Specific

Aggregation

# Downstream Tasks

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/c1760d49f319ee2dba100b90be4b4db51d3bf0b52583c4b76ac0999648602de9.jpg)  
Fig. 1: Overview of Multi-Level Sentiment Analysis Framework. The composite sentiment extracted from the firm-specific and industry-specific levels is aggregated and then incorporated as an additional feature to downstream tasks.

Risk Forecasting  
Asset Allocation

Abstract- Existing financial sentiment analysis methods often fail to capture the multi-faceted nature of risk in bond markets due to their single-level approach and neglect of temporal dynamics. We propose Multi-Level Sentiment Analysis based on pre-trained language models (PLMs) and large language models (LLMs), a novel framework that systematically integrates firm-specific micro-level sentiment, industry-specific meso-level sentiment, and duration-aware smoothing to model the latency and persistence of textual impact. Applying our framework to the comprehensive Chinese bond market corpus constructed by us (2013-2023, 1.39M texts), we extracted a daily composite sentiment index. Empirical results show statistically measurable improvements in credit spread forecasting when incorporating sentiment (3.25% MAE and 10.96% MAPE reduction), with sentiment shifts closely correlating with major social risk events and firm-specific crises. This framework provides a more nuanced understanding of sentiment across different market levels while accounting for the temporal evolution of sentiment effects.

Index Terms—Data Mining, Sentiment Analysis, Time Series Forecasting

# I. INTRODUCTION

As an irrational shock, sentiment can influence financial markets by affecting asset prices, real economic production, and other macroeconomic variables [1]. In quantitative research of the financial domain, sentiment analysis (or opinion mining) aims to quantify investor sentiment (such as bullish, bearish, or neutral) from textual data and serves as a useful feature that complements traditional financial and economic indices reflecting fundamentals and captures perceived risk or market outlook. By incorporating sentiment, forecasting models can be improved in downstream tasks such as forecasting market trends, trading volume, and risk [2]-[5].

However, the context of financial texts is often subtle and complex. Ahbali et al. pointed out that a single news paragraph may contain sentences about different firms with different

*Corresponding author: Yiwei Liu (lew1sin@outlook.com) and Xuebin Chen (chenxb@fudan.edu.cn).  
This paper was supported by the National Natural Science Foundation of China [grant numbers 72371178].  
We made our code repository publicly available on https://github.com/LEw1sin/fin_senti.

sentiments [6], which can confuse a naive classifier. The following is an example:

"Tong Guang Convertible Bond surged over  $11\%$ , ranking first in gains, while Tian Lu Convertible Bond led the decline, dropping more than  $8\%$ ."

Trivially, the sentiment polarities of Tong Guang Convertible Bond and Tian Lu Convertible Bond in the above are opposite. Most existing sentiment analysis methods applied in quantitative research extract a single overall sentiment from a text segment, without considering the heterogeneity of textual impact on different firms (firm-specific) [3], [4], [6], [7]. Therefore, we argue that sentiment analysis for financial texts requires a more fine-grained sentiment measurement approach, which leads to the first question this work aims to address:

- Q1: How to precisely analyze the sentiment of entities with different polarities from a firm-specific view under subtle and complex contexts within the same text?

Financial texts may describe asset price fluctuations and issuer conditions, as well as industry environments and trends. The latter can be regarded as industry-wide risks that may be transmitted to micro-level individuals [8]. Unfortunately, current sentiment analysis frameworks fail to consider the heterogeneity of textual impact on industries (industry-specific), and therefore cannot handle cases where a firm-specific sentiment may deviate from the overall industry trend [9]. This leads to the second question this work aims to address:

- Q2: How to derive the sentiment transmitted from the broader industry environment to related firms from an industry-specific view?

Studies from the perspective of communication have shown that due to mechanisms such as Chasing Noise [10], the impact of financial texts on assets is often non-instantaneous and nonlinear. That is, the information reflected in texts diffuses into the investment behavior of economic agents in the market with latency and persistence. These shocks are multi-phase, with varying intensity over time. Current sentiment analysis frameworks fail to incorporate such sentiment duration, which leads to the third question this work aims to address:

- Q3: How to capture the duration of text sentiment by considering its latency and persistence, enabling individual texts to interact with others and diffuse their effect from a single time point to the entire time series?

Breakthroughs in natural language processing (NLP) offer insights for addressing the above questions. Although pre-trained language models (PLMs) and large language models (LLMs) have gained increasing attention in the financial domain such as FinBERT [11], FinGPT [12], and BloombergGPT [13], which consistently outperform traditional NLP methods on general benchmark tasks [14], many well-researched NLP tasks have not yet been effectively grounded in financial applications.

For Q1, it is an aspect-based sentiment analysis (ABSA) task in the NLP domain, which involves labeling the sentiment of different entities within a sequence. Thus to solve Q1, we finetuned a BERT to perform ABSA in an end-to-end manner.

For Q2, the knowledge graph technology in the NLP domain is a powerful tool for capturing associations and enabling retrieval for big data. With it, we can model the transmission of industry-level risk to related individuals using the relationships between firms and their associated industries. Thus to solve Q2, we first transform the text sentiment into a topic view, then use retrieval-augmented generation (RAG) based on a knowledge graph to propagate it to the relevant industries, and finally to the corresponding firms.

For Q3, considering a time series composed of sentiment values at continuous but distinct time points, in order to filter out noise and extract a smooth latent trend, we can apply smoothing functions from signal processing. Thus to solve Q3, we aggregate the firm-specific and industry-specific sentiment and apply wavelet smoothing to filter out noise, ultimately obtaining a composite sentiment time series that reflects long-term trends and considers interactions among texts.

Therefore, the overview of our framework is shown as Fig. 1 and our contributions in this work are as follows:

1) Data Collection: We chose the Chinese bond market as the subject of our study, and constructed a texts corpus spanning 2013-2023, which covers bond-related news, firm announcements, analyst reports, and firm disclosures and amounts to 1,390,946 entries.  
2) Composite Sentiment Extraction: We proposed a framework for constructing a composite sentiment using a hybrid with PLMs and LLMs. This index comprehensively considers the micro-level granularity of individual firms involved in the texts, the meso-level industries that may transmit effects to related firms, as well as the latency and persistence of textual impact.  
3) Bond Default Risk Forecasting Modeling: To validate the effectiveness of sentiment, we selected bond default risk forecasting as the downstream task to backtest whether the extracted text sentiment, when used as an additional feature, can improve forecasting performance. Comparative and ablation experiments demonstrate the effectiveness of our framework in reducing prediction error, with a  $3.25\%$  reduction in MAE and a  $10.96\%$  reduction in MAPE, and the extracted sentiment is also found to be associated with social risk events.

# II. RELATED WORKS

Sentiment analysis (SA), which is considered as an extension of data mining and knowledge discovery in databases intended for unstructured textual data, can be categorized into sentence-level sentiment analysis (SLSA) and aspect-based sentiment analysis (ABSA). The former outputs the overall sentiment of a sentence in an end-to-end manner, whereas the latter is treated as a sequence labeling problem that identifies the sentiment of a specific target within the sentence. However, traditional methods assume a single overall sentiment at the whole-document level, i.e., SLSA, which "may not be the case in practice" [15], especially in the financial market. Early research primarily focused on dictionary-based methods quantifying sentiment by counting positive and negative words, which struggle to account for domain-specific semantic subtleties [7]. As data availability increased, researchers began adopting machine learning techniques such as Naïve Bayes classifiers [16], [17], which rely on manual feature engineering, thus limiting their ability to capture the nuanced meaning of financial terminology.

This limitation was addressed with Transformer-based architectures due to the powerful representation capabilities of self-attention. Transformer-based pre-trained language models (PLMs) and large language models (LLMs) not only outperform traditional models on the SLSA benchmark using the FPB [18] and FiQA-SA [19] datasets, but also achieve strong performance on the ABSA benchmark, indicating that this task in the NLP domain has been effectively addressed. We observe that as a discriminative task, discriminative PLMs outperform generative LLMs in SA. Notably, FLANG-ELECTRA [20] achieved the best results, attaining an F1-score of  $92\%$ , surpassing generative models such as FinGPT, BloombergGPT, and GPT-4 [14]. However, in quantitative research, SA is seldom treated as a more fine-grained ABSA task using Transformer-based models [11].

Since the concept of an industry or sector exists primarily in financial markets, it is rarely discussed in the NLP domain. In recent years, some studies have explored sentiment consistency among related firms within the same industry. Liu et al. constructed an "enterprise knowledge graph" of firms and showed that ignoring correlations (e.g., industry co-movement) can result in missing important spillover effects [21]. Jochem et al. demonstrated that bias can propagate along supply chains [22]. Cao et al. highlighted that industry-level sentiment or news can permeate to firm-level sentiment via graph links or information diffusion paths [23]. However, none of these studies explicitly define or utilize firm-specific sentiment.

Another key theme is how sentiment effects play out over time including latency and persistence. Studies often find that market reactions to sentiment are not instantaneous [24], i.e., news may have a lagged impact or gradual diffusion. DeFond et al. documented that bond investors initially overreact to bad earnings news, and then correct this overreaction after the official announcement [25], indicating that sentiment takes time to fade away. However, in current quantitative forecasting models that incorporate sentiment, we have not observed any work that explicitly accounts for such lag effects.

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/3ef8b33dd04dee11dd4c0130d5a9847814404fb5b2b771b39c80f915d9741f50.jpg)  
Fig. 2: Task Decomposition. Each task corresponds to one of our contributions in Section I.

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/1ada51e0cc8ba7ad13543f3a071075e8560cd9b518d104ae4bf3cb4fd920dcec.jpg)

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/8d2d51c99ae2fbf03b50daf9ef12b75b25d6beeb9dc1bd6c29b890f974e8cb21.jpg)

# III. METHODOLOGY

# A. Terminology And Task Decomposition

In this work, we define sentiment  $s$  of a single text as a continuous value ranging from -1 to 1:

$$
s \in [ - 1, 1 ]. \tag {1}
$$

There are financial implications at three polarities:  $s = -1$  indicates pessimism, suggesting deteriorating expectations or higher risk;  $s = 0$  is neutral, meaning no clear market impact;  $s = 1$  signals improved expectations or positive drivers.

Overall, our work can be summarized into three tasks as shown in Fig. 2. Task 1 is the data collection stage, where data are gathered for use in downstream processes. Task 2 is the core of this work, integrating bond sentiment extracted from unstructured texts across multiple views. Task 3 quantitatively verifies the effectiveness of the sentiment extracted in Task 2.

For Task 2, it can be decomposed as follows:

- Micro-Level ABSA for firm-specific sentiment  $s_{\alpha}$ : We fine-tuned a BERT model to perform ABSA on multiple firms mentioned in the same text (see Section. III-C).  
- Meso-Level SLSA for industry-specific sentiment  $s_{\beta}$ : We employed RAG based on knowledge graph and prompt engineering to interact with a GPT agent for SLSA (see Section. III-D).  
- Aggregation and Duration Function: Aggregation merges  $s_{\alpha}$  and  $s_{\beta}$  into the composite sentiment  $\hat{s}$ , and the duration function  $h(\cdot)$  accounts for the effective duration of texts and the interrelationships among multiple texts (see Section. III-E).

For Task 3, we need a bond default risk forecasting (BDRF) model that integrates structured features with sentiment to backtest its effectiveness (see Section. III-F).

For Task 1, we need five datasets in total to facilitate Task 2 and Task 3:

- A labeled sentiment corpus  $\mathcal{D}_1$  for ABSA fine-tuning.  
- A Knowledge Graph  $\mathcal{G}$  of topics and a Knowledge Base  $\mathcal{B}$  containing topic definitions to support RAG, which are used as a transmission tool to derive industry-specific sentiment.  
- A large-scale unlabeled corpus  $\mathcal{D}_2$  for inference the sentiment times series of all bonds.  
- A dataset  $\mathcal{D}_3$  of bonds with structured features used in.

Currently, no publicly available Chinese datasets meet these requirements for the BDRF domain. Thus, we must construct them ourselves (see Section. III-B).

The absence of macro-level sentiment in the above framework is because,  $\mathcal{D}_3$  already incorporates macroeconomic indices such as GDP.

# B. Datasets in Task 1

Considering that user sentiment on informal platforms like social media exhibits significant fluctuations, which can introduce challenging noise [26], we selected formal texts concerning firms in the mainland China bond market as the research focus. These texts consist of bond-related news, firm announcements, analyst reports, and firm disclosures.

1) Labeled Sentiment Corpus  $\mathcal{D}_1$ : We downloaded 6,881 formal Chinese texts from  $RESSET^1$  and  $Wind^2$ , and then our financial experts assigned soft labels to them in the form of probability distributions over sentiment polarities:

$$
\mathbf {p} _ {s} = \left[ p _ {\text {n e g}}, p _ {\text {n e u}}, p _ {\text {p o s}} \right], \quad \text {s . t .} \quad p _ {\text {n e g}} + p _ {\text {n e u}} + p _ {\text {p o s}} = 1 \tag {2}
$$

where  $p_{\text{neg}}$ ,  $p_{\text{neu}}$  and  $p_{\text{pos}}$  are the probabilities of negative, neutral and positive polarity, respectively.

2) Knowledge Graph  $\mathcal{G}$  And Knowledge Base  $\mathcal{B}$ : We selected all 28 primary industries and 12 significant secondary industries according to SWS RESEARCH $^3$ , forming a comprehensive set of 40 industries. Additionally, we defined 117 topics across various domains, with details in Appendix. A. The base  $\mathcal{B}$  is the definitions of all 117 topics, and the graph  $\mathcal{G}$  is a predefined Boolean matrix:

$$
\mathcal {G} = \left( \begin{array}{c c c c} g _ {1, 1} & g _ {1, 2} & \dots & g _ {1, 1 1 7} \\ g _ {2, 1} & g _ {2, 2} & \dots & g _ {2, 1 1 7} \\ \vdots & \vdots & \ddots & \vdots \\ g _ {4 0, 1} & g _ {4 0, 2} & \dots & g _ {4 0, 1 1 7} \end{array} \right) _ {4 0 \times 1 1 7}, \tag {3}
$$

$$
s. t. \quad g _ {m, n} = \mathbb {1} _ {n \sim m}
$$

where  $m$  is one of a predefined set of industries, with a total of 40 industries, and  $n$  is one of a predefined set of topics, with a total of 117 topics. The notation  $n \sim m$  indicates that topic  $n$  has an impact on industry  $m$ , where  $g_{m,n} = 1$  if topic  $n$  influences industry  $m$  and  $g_{m,n} = 0$  otherwise.

<sup>1</sup>https://www.resset.com/index/home/  
2https://www.wind.com.cn/portal/en/EDB/index.html  
<sup>3</sup>https://www.swsresearch.com/institute_sw/home

3) Large-scale Unlabeled Corpus  $\mathcal{D}_2$ : We constructed a corpus with daily frequency spanning eleven years (2013 to 2023) from Infobank and WiseSearch, containing a total of 1,390,946 entries, with a daily frequency making the composite text sentiment a medium-frequency factor.  
4) Firms Features Dataset  $\mathcal{D}_3$ : We collected 6,472 bonds from  $iFinD^6$  spanning eleven years (2013 to 2023) with 45 features (categorization and the complete list of feature names can be found in Appendix. B). It is a time-series tabular dataset where columns are feature names and rows correspond to a bond's features on a specific day. The dataset was split for Task 3 at the bond level, rather than the time-series level, into training, validation, and test subsets in a 7:1:2 ratio.

With  $\mathcal{D}_3$ , we can obtain information on bonds and the firms issuing them. Therefore, we further divide  $\mathcal{D}_2$  into two subsets (it can be achieved by named entity recognition (NER); however, it is beyond this paper, so we skip that): the micro-level ABSA inference dataset  $\mathcal{D}_{2,\alpha}$ , which contains a total of 563,493 entries, and the meso-level SLSA inference dataset  $\mathcal{D}_{2,\beta}$ , which contains a total of 827,453 entries.

# C. Firm-Specific Sentiment Analysis in Task 2

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/0edf2c858a1334678b63c39872eb032beef28136c3015a0d2ecb88905efa18b8.jpg)  
Fig. 3: ABSA Procedure.

As mentioned in Section. II, discriminative PLMs outperform generative LLMs in SA. Therefore, to be conducive to the more fine-grained ABSA, we fine-tuned a BERT model  $f_{1}(\cdot)$  followed by a multilayer perception (MLP). This subtask is trained in a supervised manner on labeled  $\mathcal{D}_1$  and inferred on unlabeled  $\mathcal{D}_{2,\alpha}$ .

4http://hk.infobank.cn/  
<sup>5</sup>https://www.wisers.com/  
<sup>6</sup>https://ft.10jqka.com.cn/

Instead of treating ABSA as a sequence labeling problem, we directly output the sentiment for each entity in an end-to-end manner. The process of a single text is shown in Fig. 3. After forwarding the text through BERT, we obtain both sentence-level and token-level embeddings. Since the same text may describe multiple bonds, we extract the embeddings of each bond-related token, stack them together, and then refer to the mean-max pooling algorithm [27] to obtain the global representation of the bond. The sentence-level embedding is then concatenated with this representation and passed through an MLP to forecast the sentiment polarity with the highest probability, where the highest probability means the MLP outputs the probabilities of the three polarities: negative, neutral, and positive. Specifically, the mean-max pooling in our ABSA subtask for single text can be described as Algorithm. 1.

Algorithm 1: Mean-Max Pooling  
Input: labeled  $\mathcal{D}_1$  , unlabeled  $\mathcal{D}_{2,\alpha}$  ABSA BERT  $f_{1}(\cdot)$  MLP, an arbitrary bond entity i Output: micro-level sentiment  $s_\alpha$    
foreach text  $j\in \mathcal{D}_1\cup \mathcal{D}_{2,\alpha}$  do   
[CLS] embedding, token-level embedding  $= f_{1}(j)$  . if  $j$  contains i then stack the token-level embeddings of bond i to obtain its token list ; calculate the mean of the token list to get the one-dimensional avg; calculate the maximum of the token list to get the one-dimensional max ; concatenate [CLS] embedding, avg, max to get the global feature [[CLS]; avg; max] ；  $s_\alpha = max(MLP([CLS];avg;max])$  ：   
end   
10 end   
11 return micro-level sentiment  $s_\alpha$

During inference, since  $\mathcal{D}_{2,\alpha}$  is at a daily frequency, for a given bond  $i$ , there will either be excessive texts in a single day or none at all. Therefore, taking account of time series, we denote the calculation method for the micro-level sentiment  $s_{\alpha,i,k}$  of an arbitrary bond on a given day as follows:

$$
s _ {\alpha , i, k} = \left\{ \begin{array}{l} \frac {1}{J _ {i}} \sum_ {j = 1} ^ {J _ {i}} s _ {\alpha , i, j, k}, J _ {i} \geq 1 \\ 0, J _ {i} = 0 \end{array} \right., \tag {4}
$$

where  $i$  is an arbitrary bond,  $j$  is an arbitrary text on a given day,  $J_{i}$  is the number of texts for a given bond,  $k$  is an arbitrary day,  $s_{\alpha ,i,j,k}$  is the micro-level sentiment of a particular text for a specific bond on a given day calculated by Algorithm. 1. This equation implies that the micro-level sentiment  $s_{\alpha ,i,k}$  of an arbitrary bond on a given day is the average of all sentiment values involving bond  $i$  on that day, thus preventing the accumulation of text volume from leading to extremes. After the micro-level analysis, we get the firm

specific sentiment matrix  $S_{\alpha}$

$$
\mathcal {S} _ {\alpha} = \left( \begin{array}{c c c c} s _ {\alpha , 1, 1} & s _ {\alpha , 1, 2} & \dots & s _ {\alpha , 1, K} \\ s _ {\alpha , 2, 1} & s _ {\alpha , 2, 2} & \dots & s _ {\alpha , 2, K} \\ \vdots & \vdots & \ddots & \vdots \\ s _ {\alpha , I, 1} & s _ {\alpha , I, 2} & \dots & s _ {\alpha , I, K} \end{array} \right) _ {I \times K}, \tag {5}
$$

where  $I$  is the total number of firms, and  $K$  is the total number of days in the time series. Since  $s_{\alpha ,i,k}$  is the average of firm-specific sentiment values associated with bond  $i$  on day  $k$ , and each individual text's sentiment lies within the range  $[-1,1]$ , the range of  $s_{\alpha ,i,k}$  is also  $[-1,1]$ .

# D. Industry-Specific Sentiment Analysis in Task 2

Since LLMs possess zero-shot generalization capabilities [28] and achieve strong performance on classification tasks when prompted with few-shot learning [29] and Chain-of-Thought (CoT) reasoning [30], we treat GPT as an agent for the broader meso-level analysis. Using few-shot learning and CoT, GPT generates the sentiment of a given text with respect to its topic in an end-to-end manner. It is followed by RAG based on the Knowledge Graph  $\mathcal{G}$  and Knowledge Base  $\mathcal{B}$ , mapping the topic to the relevant industries it may affect, thereby obtaining industry-specific sentiment. The dataset used for this SLSA subtask is  $\mathcal{D}_{2,\beta}$ .

This process of a single text is illustrated in Fig. 4, which consists of three steps:

1) Each text is processed using prompt engineering and passed through a GPT agent to obtain a sentiment polarity (prompt details in Appendix. D).  
2) The text is encoded into an embedding using an embedding model. This embedding is then compared with the topic embeddings in the Knowledge Embedding Base  $\mathcal{B}^{\prime}$  stored in the vector database by computing the cosine similarity. The top 5 most similar topics are recalled, and the sentiment obtained in the first step is assigned to these five topics.  
3) The Boolean matrix Knowledge Graph  $\mathcal{G}$  is used as a bridge to map upstream topics to downstream industries, thereby deriving industry-specific sentiment.

Their formalized pseudocode is shown in Algorithm 2. It is important to note that  $s_{\beta}$  represents the sentiment of a specific industry, and we compute the cosine similarity in order to map topics to their associated industries based on the semantic similarity between embeddings, which can also be used subsequently to control the strength of influence on different industries. In  $D_3$ , the business scope or industry classification of the parent firm issuing each bond is often included. We can leverage this information to further match bonds with industries, thereby obtaining the meso-level sentiment. The transformation relationships among topics, industries, and bond are illustrated in Fig. 5.

During inference, similar to ABSA, considering time series and excessive texts, the meso-level sentiment  $s_{\beta ,i,k}$  of an

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/a0c7c2f6ce31d5ad9002f08ee23afad15a9fe9ca658caa2e7000c0967e83e4f4.jpg)  
Fig. 4: SLSA Procedure.

Algorithm 2: RAG Mapping  
Input: unlabeled  $\mathcal{D}_{2,\beta}$  GPT agent  $f_{2}(\cdot)$  embedding model  $f_{3}(\cdot)$    
Output: meso-level sentiment  $s_\beta$    
1 foreach text  $j\in \mathcal{D}_{2,\beta}$  do   
2 text sentiment  $= f_{2}(j)$  .   
3 text embedding  $= f_{3}(j)$  .   
4 topics cosine similarity list  $\mathbf{l} =$  empty list;   
5 foreach topic  $n\in \mathcal{B}'$  do   
6 | 1 append  $\cos (f_3(j),f_3(n))$  .   
7 end   
8 top5 nearest topics  $=$  filtered(l);   
9  $s_\beta =$  the sum of  $f_{2}(j)$  multiplied by  $\mathcal{G}$  and l;   
10 end   
11 return meso-level sentiment  $s_\beta$

arbitrary bond on a given day is computed as follows:

$$
\begin{array}{l} s _ {\beta , i, k} = \frac {1}{M ^ {*}} \sum_ {m = 1} ^ {M ^ {*}} s _ {\beta , m, k} \\ = \left\{ \begin{array}{l} \frac {1}{M ^ {*}} \sum_ {m = 1} ^ {M ^ {*}} \sum_ {n = 1} ^ {N ^ {*}} \sum_ {j = 1} ^ {J _ {i}} c _ {j, n} \cdot s _ {\beta , n, j, k} \cdot g _ {m, n}, J _ {i} \geq 1 \\ 0, J _ {i} = 0 \end{array} \right., \tag {6} \\ \end{array}
$$

where  $i$  is an arbitrary bond,  $M^{*}$  represents the relevant industry to which the bond  $i$  belongs,  $j$  is an arbitrary text on a given day,  $k$  is an arbitrary day,  $s_{\beta ,n,j,k}$  is the sentiment of a particular text for a specific topic on a given day,  $J_{i}$  is the number of text for a given bond.  $g_{m,n}$  is the influence of topic  $n$  on industry  $m$ , taking a value of either 0 or 1.  $N^{*}$  is the top 5 most similar topics retrieved through  $\mathcal{B}'$ , with  $c_{j,n}$  denoting the cosine similarity between the embedding of text  $j$  and the embeddings of the top 5 most similar topics  $N^{*}$ . The weighted average of similarity coefficients represents how the impact of a text on a specific industry is related to

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/ba44add91b6af6973c7cef869ac16cd27df7459bb0dc09c4cbe8e409009f3543.jpg)  
Fig. 5: The Transformation Relationships.

its similarity  $c_{j,n}$ . This equation implies that the meso-level sentiment  $s_{\beta, i, k}$  of an arbitrary bond on a given day is the average of the industry sentiment  $s_{\beta, m, k}$  relevant to that day. Each industry sentiment  $s_{\beta, n, j, k}$  is computed as a weighted average of the topic sentiments  $s_{\beta, n, j, k}$ , where the similarity score  $c_{j,n}$  controls the influence strength of different industries on the bond. The term  $g_{m,n}$  from the Knowledge Graph  $\mathcal{G}$  enables the association between topics and industries. After the procedure of meso-level analysis, we could get the industry-specific sentiment matrix  $S_{\beta}$ :

$$
\mathcal {S} _ {\beta} = \left( \begin{array}{c c c c} s _ {\beta , 1, 1} & s _ {\beta , 1, 2} & \dots & s _ {\beta , 1, K} \\ s _ {\beta , 2, 1} & s _ {\beta , 2, 2} & \dots & s _ {\beta , 2, K} \\ \vdots & \vdots & \ddots & \vdots \\ s _ {\beta , M, 1} & s _ {\beta , M, 2} & \dots & s _ {\beta , M, K} \end{array} \right) _ {M \times K}, \tag {7}
$$

where  $M$  is the total number of industries, and  $K$  is the total number of days in the time series. To avoid sentiment extremes caused by excessive text volume in certain industries on a given day, we apply full-sample z-score standardization to each entry in  $\mathcal{S}_{\beta}$ , in order to reduce the absolute differences among industry sentiment  $s_{\beta,m,k}$ . Since industry sentiment  $s_{\beta,m,k}$  is a weighted sum of topic sentiment, its range may exceed  $[-1,1]$ . As the meso-level sentiment  $s_{\beta,i,k}$  is the average of multiple industry sentiment values, its range may also exceed  $[-1,1]$ .

# E. Aggregation and Duration Function in Task 2

By querying the industry of the bond, we can use Eq. 6 and  $S_{\beta}$  to map  $s_{\beta,i,k}$  and derive the daily sentiment  $\hat{s}_{i,k}$  for each bond on a given day:

$$
\hat {s} _ {i, k} = s _ {\alpha , i, k} + s _ {\beta , i, k}. \tag {8}
$$

where  $s_{\alpha, i, k}$  is the micro-level sentiment of bond  $i$  calculated from ABSA, and  $s_{\beta, i, k}$  is the meso-level sentiment of bond  $i$  calculated from SLSA. We directly add them together based on the assumption in the CAPM model [31] that systematic risk (industry-specific) and unsystematic risk (firm-specific) are independent and additive. Moreover, we standardize meso-level component to ensure they are on a comparable scale. We assume that the additive formulation can more comprehensively assess and reflect market expectations. In Section IV-D, we also design experiments to demonstrate that the additive strategy yields better performance for BDRF compared to treating them as separate variables. Finally, we get the sentiment time series of each bond:

$$
\left\{\hat {s} _ {i, k} \right\} _ {k = 1} ^ {K} = \left\{\hat {s} _ {i, 1}, \hat {s} _ {i, 2}, \dots , \hat {s} _ {i, K} \right\}, \tag {9}
$$

Algorithm 3: BDRF Modeling  
Input: the length  $T$  of rolling window, bonds features dataset  $\mathcal{D}_3$ , BDRF model  $f_4(\cdot)$   
Output: forecasted credit spread sequence  $\{\hat{\mathbf{y}}_i\}_{i=1}^N$   
/ $\star \mathbf{X}_i \cup \mathbf{y}_i = \widetilde{\mathbf{X}}_i, \mathbf{X}_i \in \mathbb{R}^d, \mathbf{y}_i \in \mathbb{R}, \widetilde{\mathbf{X}}_i \in \mathbb{R}^{d+1}$   
\*/  
 $/\star \{\widetilde{\mathbf{X}}_i\}_{i=1}^N = \mathcal{D}_3$   
\*/  
foreach bond  $\widetilde{\mathbf{X}}_i \in \mathcal{D}_3$  do  
foreach window  $\widetilde{\mathbf{X}}_{i,t} \in \widetilde{\mathbf{X}}_i$  do  
// each point  $t \in \{1,2,\dots,N-T-1\}$   
// window time step  $= 1$ $\hat{y}_{i,t+q} = f_4(\widetilde{\mathbf{X}}_{i,t})$   
//  $q$  is the q-th day after the window, eg. 1 or 2.  
end  
 $\hat{\mathbf{y}}_i = \{\hat{y}_{i,t+q}\}_{t=1}^{N-T-1}$ ;  
end  
return forecasted credit spread sequence  $\{\hat{\mathbf{y}}_i\}_{i=1}^N$

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/9fdd8f83484eeb837106f23ff585555973439cc91e4da3ed6126575f39902a25.jpg)  
Fig. 6: Visualization of Rolling Window.

when  $k = K$  is the current time, it integrates historical data for real-time inference, and when  $k = K$  is a past date, it backtests. On days with fewer texts, a bond's sentiment is driven by its industry's sentiment, indicating lower market attention and a greater reliance on industry factors.

However, not every bond or industry has daily text coverage, resulting in sparse time series with many neutral zeros. Text impacts persist beyond the publication day [32]. To address it, we design a duration function  $h(\cdot)$  to interpolate  $\{\hat{s}_{i,k}\}_{k=1}^{K}$ , smoothing sequences and capturing lasting text effects:

$$
\left\{s _ {i, k} \right\} _ {k = 1} ^ {K} = h \left(\left\{\hat {s} _ {i, k} \right\} _ {k = 1} ^ {K}\right), \tag {10}
$$

where we choose wavelet smoothing as the duration function  $h(\cdot)$ , which is widely used in time series analysis and has been proven effective in noise reduction, missing data imputation, and capturing data trends [33].

Notably, sentiment  $s$  is initially continuous. In ABSA and SLSA, for convenience, it is converted into a polarity classification task. After summation and  $h(\cdot)$ , the resulting values do not correspond to extreme points in most cases, and they may exceed the value range  $[-1, 1]$  of individual texts.

# F. Bond Default Risk Forecasting Modeling in Task 3

The dataset used for the BDRF subtask is  $\mathcal{D}_3$ , which contains features such as the debt ratio of bond-issuing firms. We take credit spread as the proxy dependent variable for default risk [34]:

$$
C r e d i t S p r e a d = B o n d Y i e l d - R i s k - f r e e R a t e, \tag {11}
$$

where if the credit spread narrows, it indicates that market investors perceive a lower default risk for the bond issuer, implying an improvement in credit quality. Our BDRF modeling process adopts a rolling window mechanism, which is shown in Algorithm 3.

In Algorithm 3,  $\mathbf{X}_i$  is the independent variable set including sentiment  $s$ ,  $\mathbf{y}_i$  is the credit spread,  $i$  means it is the tabular data of bond  $i$ ,  $N$  is the total number of bonds in  $\mathcal{D}_3$ . The visual process of the rolling window is shown in Fig. 6. We employ a five-layer Transformer encoder to encode the timeseries data, feeding the final hidden state into an MLP to regress  $\mathbf{y}_i$ , taking  $\mathbf{X}_i$  as the input. To assess our model's robustness, we forecast the credit spread for the  $q$ -th day after the observation window.

# IV. EXPERIMENTS

# A. Setting

1) Model Selection: The sketch of the models and their baselines, along with the experimental setup, is as follows:

- For ABSA BERT  $f_{1}$ , we used BERT-base-Chinese and compared different global feature extraction methods (see Section. IV-B).  
- For GPT Agent  $f_{2}$ , we took Qwen2.5-3B-Instruct [35] as the foundation model and compared it with others under the same prompt settings (see Section. IV-C).  
- For Embedding Model  $f_{3}$ , we used bge-large-zh-v1.5 [36] to encode texts.  
- For BDRF Model  $f_{4}$ , we applied a five-layer Transformer encoder (see Section. IV-D).

2) Data Standardization: The order of magnitude of each feature column in  $\mathcal{D}_3$  is inconsistent, thus we apply z-score standardization to each feature column to accelerate the convergence for BDRF modeling.

3) Hyperparameters: This work is implemented by PyTorch on an NVIDIA RTX A5000:

- For ABSA BERT followed by an MLP, we used MSE as the criterion, with Adam optimizer (lr = 1e-4, weight decay for BERT = 1e-5 and weight decay for MLP = 1e-7 respectively). Train for 50 epochs. During inference, we take the polarity with the highest probability among the three polarities as the output.

$$
M S E \left(\mathbf {p} _ {s}, \hat {\mathbf {p}} _ {s}\right) = \frac {1}{U} \sum_ {u = 1} ^ {U} \left(\mathbf {p} _ {s} - \hat {\mathbf {p}} _ {s}\right) ^ {2}, \tag {12}
$$

where  $U$  is the number of texts in  $\mathcal{D}_1$ ,  $\mathbf{p}_s$  is a three-dimensional vector indicating three polarities.

- For the BDRF model, each hidden layer dimension of the Transformer encoder and the length  $T$  of rolling window were set to 64 and 21, respectively. We used RMSE as the criterion, with RMSprop optimizer (lr = 1e-4, weight decay = 1e-7, momentum = 0.9). Train for 50 epochs.

$$
R M S E \left(\mathbf {y} _ {i}, \hat {\mathbf {y}} _ {i}\right) = \sqrt {\frac {1}{N _ {t r a i n}} \sum_ {i = 1} ^ {N _ {t r a i n}} \left(\mathbf {y} _ {i} - \hat {\mathbf {y}} _ {i}\right) ^ {2}} \quad , \tag {13}
$$

where  $N_{train}$  is the total number of bonds in  $\mathcal{D}_3$  trainset,  $\mathbf{y}_i$  is the credit spread of bond  $i$ .

- We chose the Daubechies 4 wavelet as the basis function for  $h(\cdot)$ , with the level set to 6. Comparative results for the hyperparameters are in Section IV-D.  
4) Metrics: The metrics are mainly divided into two categories: one measures the sentiment output of  $f_{1}$  and  $f_{2}$ , and the other measures the credit spread output of  $f_{4}$ :

$$
P r e c i s i o n = \frac {T P _ {s}}{T P _ {s} + F P _ {s}} \quad , \tag {14}
$$

where  $TP_{s}$  and  $FP_{s}$  are the numbers of correct and incorrect polarities in the  $\mathcal{D}_1$  testset, respectively.

$$
M A E \left(\mathbf {y} _ {i}, \hat {\mathbf {y}} _ {i}\right) = \frac {1}{N _ {t e s t}} \sum_ {i = 1} ^ {N _ {t e s t}} \left| \mathbf {y} _ {i} - \hat {\mathbf {y}} _ {i} \right|, \tag {15}
$$

$$
M A P E \left(\mathbf {y} _ {i}, \hat {\mathbf {y}} _ {i}\right) = \frac {1}{N _ {t e s t}} \sum_ {i = 1} ^ {N _ {t e s t}} \left| \frac {\mathbf {y} _ {i} - \hat {\mathbf {y}} _ {i}}{\mathbf {y} _ {i}} \right|, \tag {16}
$$

where  $N_{test}$  is the total number of bonds in  $\mathcal{D}_3$  testset,  $\mathbf{y}_i$  is the credit spread of bond  $i$ .

# B. Results on Firm-Specific Sentiment Analysis

TABLE I: Pooling Comparison Results.  

<table><tr><td>Method</td><td>Precision (%)</td></tr><tr><td>Mean Pooling</td><td>86.19</td></tr><tr><td>Max Pooling</td><td>87.59</td></tr><tr><td>Mean-Max Pooling</td><td>88.27</td></tr></table>

In this experiment, in addition to using the mean-max pooling method mentioned in Algorithm. 1 to extract global features, we also attempted to directly concatenate the results of mean pooling and max pooling with the [CLS] embedding as a baseline for comparison. The results are shown in Table. I, which shows that among these three methods, the mean-max pooling approach we used achieves the best performance.

# C. Results on Industry-Specific Sentiment Analysis

TABLE II: Foundation Model Comparison Results.  

<table><tr><td>Foundation Model</td><td>Precision (%)</td></tr><tr><td>DeepSeek-R1-Distill-Qwen-1.5B [37]</td><td>51.8</td></tr><tr><td>Llama-3.2-3B-Instruct8</td><td>55.4</td></tr><tr><td>Qwen2.5-3B-Instruct [35]</td><td>75.0</td></tr></table>

In this experiment, we evaluated three foundation models under the same prompt settings. Since  $\mathcal{D}_{2,\beta}$  has 827,453 entries, we randomly sampled five subsets of 100 entries each. The models independently generated sentiment outputs for these subsets, and then our financial experts assessed their precision, the average precision across the five subsets was taken as the model's performance. Table. II shows that Qwen2.5-3B-Instruct we used exhibited the most stable performance.

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/6f57b1c3d34fdf37474c6a6c9ffecc4e739427f76f068b235a4b9507f769af53.jpg)

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/2db942d677c477e7651b7bca23a1eb025cf331912c6ac3d976404e3e0283d391.jpg)

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/e5b16a8b73ebecc469eacbd3357f18f2ba16827109f7c81662f737a65f10841e.jpg)

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/5ade4da61614af1ad30904c1af978be9313501c21f4898e24d91cddb599d799e.jpg)

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/a00112dc0895f7fce64210943ac79c81c214dabdd20ee1f553f8324da20e7b7b.jpg)

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/38bc1a0ac292bd751c8cd41c148f1294f93baec08d12e2537152b0121c5d7ed2.jpg)

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/b2454687ccd54f30741c1064f98d617bf0439d1e0ac689009315b53bbc90d25d.jpg)

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/19095f297669da2cf9009e13a110099c331a35d1956ff9018578928c30dc1a77.jpg)  
Fig. 7: Sentiment Heatmap for 40 Industries (2013-2023). Values exceeding -1 and 1 were truncated for display. The marked period exhibits a significant sentiment shift vis-à-vis its preceding period, aligning with the corresponding social event.

We visualized the industry-specific sentiment matrix  $S_{\beta}$  obtained using Qwen2.5-3B-Instruct and Algorithm 2, as shown in Fig. 7. Trivially, we have the following observations:

1) All industries exhibit similar sentiment patterns, with changes following the same overall trend, i.e., collective optimism or pessimism. It endorses the financial contagion [38], which illustrates how economic shocks or significant events in one market can lead to simultaneous reactions spreading across multiple markets.  
2) At certain time points, the sentiment of each industry undergoes collective shifts, resembling the peer effect [39]. These events act as a "curtain" for most industries, immediately affecting industry-wide sentiment and persisting for a period of time. In Fig. 7, we highlighted several representative time slots and found that they correspond to influential events in Chinese society. For example, the highlighted ① refers to the mid-2015 Chinese Stock Market Turbulence, during which a large number of retail investors, affected by short-selling and leverage mechanisms, began to sell off stocks massively. As a result, the bond market was severely impacted, and sentiment across all industries remained depressed for several months. ⑥ corresponds to the end of 2022, when the Chinese government abandoned the "Zero-COVID Policy." The economy, previously constrained by the pandemic, began to recover, leading to a shift in

sentiment from bearish to bullish across most industries, whereas industries such as Television and Broadcasting, Gaming, Advertising and Marketing, Digital Media, Social Media, and Publishing remained in a depressed state compared to others, as people had fewer opportunities to socialize through these media while staying at home.

To analyze whether the industry sentiment time series exhibits seasonal trends, we selected the industry Automobile and performed decomposition using Seasonal Decomposition of Time Series by Loess (STL) [40]. The visualization is shown in Fig. 8. The third subplot, "Season," indicates that industry sentiment does not exhibit significant seasonality. The fourth subplot, "Resid," shows that the noise distribution in the series remains relatively stable, with few outliers. The marked bearish period corresponds to the social event: In early 2018, China announced an early subsidy phase-out for new energy vehicles, starting the industry elimination competition.

# D. Empirical Analysis on BDRF Modeling

In Section IV-C, we presented the qualitative association between industry sentiment and risk events. To quantitatively analyze the relationship between the composite sentiment of each individual bond and its downstream task performance, we selected bond default risk forecasting (BDRF) as the very task. The following experiments quantify the effect of incorporating our extracted text sentiment on credit spread forecasting.

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/e598667e2a906d6d4823d948a8e8cc7606a899ade44da365a229e9982affb604.jpg)  
Fig. 8: Industry Sentiment Time Series Decomposition of Automobile (2013-2023). From top to bottom, the four subplots represent the origin, trend, seasonality, and residuals.

TABLE III: Comparison Results on Forecasting Target  $q$  

<table><tr><td>Forecasting Target t + q</td><td>Sentiment</td><td>MAE (e-5)</td><td>MAPE (e-3)</td><td>p</td><td>ΔMAE (%↓)</td><td>ΔMAPE (%↓)</td></tr><tr><td>t + 1</td><td></td><td>11.2366</td><td>9.4581</td><td>n/a</td><td>n/a</td><td>n/a</td></tr><tr><td>t + 1</td><td>✓</td><td>11.3680</td><td>8.3686</td><td>0.0812</td><td>-1.1693</td><td>11.5194</td></tr><tr><td>t + 2</td><td></td><td>8.9683</td><td>8.0033</td><td>n/a</td><td>n/a</td><td>n/a</td></tr><tr><td>t + 2</td><td>✓</td><td>8.6765</td><td>7.1257</td><td>0.0373</td><td>3.2539</td><td>10.9658</td></tr><tr><td>t + 3</td><td></td><td>14.1859</td><td>12.4256</td><td>n/a</td><td>n/a</td><td>n/a</td></tr><tr><td>t + 3</td><td>✓</td><td>14.2665</td><td>10.6770</td><td>0.0405</td><td>-0.5682</td><td>14.0730</td></tr><tr><td>t + 4</td><td></td><td>16.6853</td><td>10.4440</td><td>n/a</td><td>n/a</td><td>n/a</td></tr><tr><td>t + 4</td><td>✓</td><td>16.5656</td><td>8.0975</td><td>0.0483</td><td>0.7170</td><td>22.4673</td></tr></table>

-  $\checkmark$  represents adding the composite sentiment into the feature set.

First, to demonstrate how credit spread forecasting performance changes under different forecasting targets  $q$  after incorporating our extracted text sentiment, we conducted comparative experiments. The results are shown in Table III. Notably, we compute the  $p$ -value using the non-parametric Permutation Test [41], which compares credit spread forecasts  $\hat{\mathbf{y}}_i$  from models with and without sentiment, and does not require assumptions about the underlying data distribution, as both the BDRF model  $f_4$  and the sentiment series are based on deep learning. In addition,  $\Delta \mathrm{MAE}$  and  $\Delta \mathrm{MAPE}$  in the table denote the percentage change in MAE and MAPE with sentiment, computed by subtracting the corresponding metric of the with-sentiment group from that of the without-sentiment group. That is, a positive value indicates an increase, while a negative value indicates a decrease. We found that under statistical significance, the model exhibits varying degrees of improvement in forecasting performance across different forecasting targets  $q$ . When the forecasting target is  $q = 2$  (i.e., the second trading day  $t + 2$  after the current day), the improvement is most robust, with  $3.2539\%$  in  $\Delta \mathrm{MAE}$  and  $10.9658\%$  in  $\Delta \mathrm{MAPE}$ . We adopt the model under this setting for subsequent analysis (denoted as  $f_4^*$ ).

Second, to examine the collinearity among features in the BDRF model  $f_{4}$ , as well as their contributions during the forecasting process, we conducted a feature analysis. The complete descriptions of all features can be found in Appendix. B. We plotted a correlation matrix among the features, as shown in

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/e91523c1a474b6a0deb2fb185f971603fdc743b7c7765051d8cbbe379d83fa87.jpg)  
Fig. 9: The Correlation Matrix of Features.

TABLE IV: Ablation Results.  

<table><tr><td>Micro-Level Sentiment</td><td>Meso-Level Sentiment</td><td>Duration Function</td><td>MAE (e-5)</td><td>MAPE (e-3)</td><td>p</td><td>ΔMAE (%)↓</td><td>ΔMAPE (%)↓</td></tr><tr><td></td><td></td><td></td><td>8.9683</td><td>8.0033</td><td>n/a</td><td>n/a</td><td>n/a</td></tr><tr><td>✓</td><td></td><td></td><td>8.7890</td><td>10.0594</td><td>0.0573</td><td>1.9991</td><td>-25.6900</td></tr><tr><td></td><td>✓</td><td></td><td>8.7621</td><td>8.0367</td><td>0.0472</td><td>2.2989</td><td>-0.4170</td></tr><tr><td>✓</td><td>✓</td><td></td><td>15.567</td><td>43.479</td><td>≈ 0.0</td><td>-73.579</td><td>-443.258</td></tr><tr><td>*</td><td>*</td><td></td><td>8.9489</td><td>8.0205</td><td>0.1013</td><td>0.2159</td><td>-0.2148</td></tr><tr><td>✓</td><td>✓</td><td>✓</td><td>8.6765</td><td>7.1257</td><td>0.0373</td><td>3.2539</td><td>10.9658</td></tr></table>

- Blue numbers indicate significant results ( $p$ -value  $< 0.05$ ) based on the non-parametric Permutation Test [41].

Fig. 9. It can be observed that the composite sentiment extracted by us does not exhibit significant collinearity with other features. Strong collinearity exists within the Firm Financial and Operational Indicators listed in Table. VII among the remaining independent variables. Within the Macroeconomic and Financial Indicators, collinearity is present among Shibor, Manufacturing PMI, Macroeconomic Climate Leading Index, GDP, and AFRE. We presented the feature attribution of  $f_4^*$  in Table. III, where the feature importance is calculated by randomly permuting the positions of independent variable features. The complete results are provided in Appendix. C. We observe that in the forecasting of short-term credit spread, Macroeconomic and Financial Indicators contribute the most, exceeding the contributions of other market and firm-level indicators. The composite sentiment we extracted ranks 17th among the 46 features, comparable to some highly contributing firm-level indicators such as Current Ratio.

Third, to evaluate the effectiveness of the three components in Task 2 under partial integration, i.e., micro-level firm-specific sentiment, meso-level industry-specific sentiment, and the duration function, we conducted an ablation study. We selected a representative supplier firm in the industry Automobile, Contemporary Amperex Technology Co., Limited (CATL), to visualize each component. The results are shown in Fig. 10, from which we can draw two observations as follows:

1) Each individual component exhibits significant fluctu-

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/db84be2f85b0868d7403d9e6d73af98010580347f07de39e95a70b32f0ab3ae3.jpg)  
Fig. 10: Component Visualization of CATL. Since industry-specific sentiment is transmitted from topic sentiment via the Knowledge Graph  $\mathcal{G}$ , and topic sentiment is aggregated from daily sentiment, if all industries associated with this company exhibit the same polarities on certain days, this can lead to extreme values appearing on those days in the visualization.

ations. However, after aggregation and the application of the duration function, the all-inclusive factors curve effectively captures the overall trend of public sentiment.

2) CATL and its associated industry Automobile, both exhibit similar bearish trends during the marked period. However, on certain days, the sentiment of CATL is even more pessimistic than that of the Automobile industry. This indicates that during these periods, the company is not only influenced by the transmission of industry-wide bearish sentiment, but also directly targeted by a substantial number of bearish texts in the market. Since we aggregate firm-specific and industry-specific sentiment, the composite sentiment takes both effects into account simultaneously.

The quantitative results are presented in Table. IV, where the first row shows results without sentiment,  $(\checkmark)$  indicates included components, and in the fifth row, the two asterisks  $(^*)$  mean that micro-level and meso-level sentiment are used as separate features instead of being summed. Our analysis revealed that both micro- and meso-level sentiments exhibit significant individual biases when used in isolation. The microlevel sentiment fails to capture systemic industry risks, while the meso-level sentiment overlooks firm-specific vulnerabilities. As shown in Table. IV, using either sentiment component alone actually degrades the performance of the BDRF model  $f_{4}$  compared to the baseline (first row), demonstrating that partial integration leads to incomplete risk assessment. Most critically, omitting the duration function results in the most severe performance deterioration. As illustrated in Fig. 10, raw sentiment without temporal smoothing show extreme volatility that poorly reflects actual risk dynamics. The wavelet-based duration function effectively addresses this by:

- Accounting for the latency of textual impact.  
- Modeling the persistence of sentiment effects.  
- Smoothing out noise while preserving meaningful trends. Only through the complete framework, i.e., aggregating both sentiment levels and applying duration-aware smoothing, do we achieve optimal forecasting accuracy. This integrated approach successfully balances firm-specific and industry-wide

TABLE V: Comparison Results of Duration Function.  

<table><tr><td>Duration Function</td><td>MAE (e-5)</td><td>MAPE (e-3)</td><td>p</td><td>ΔMAE (%↓)</td><td>ΔMAPE (%↓)</td></tr><tr><td>n/a</td><td>8.9683</td><td>8.0033</td><td>n/a</td><td>n/a</td><td>n/a</td></tr><tr><td>Smoothing Spline (factor set to 16)</td><td>8.7114</td><td>8.0536</td><td>0.0342</td><td>2.8649</td><td>-0.6282</td></tr><tr><td>Daubechies 4 wavelet (level set to 3)</td><td>8.8166</td><td>9.3779</td><td>0.0457</td><td>1.6915</td><td>-17.1753</td></tr><tr><td>Daubechies 4 wavelet (level set to 6, f4*)</td><td>8.6765</td><td>7.1257</td><td>0.0373</td><td>3.2539</td><td>10.9658</td></tr></table>

risk factors while respecting the temporal nature of sentiment influence, as evidenced by the stable, representative curve of "All-inclusive Factors" in Fig. 10.

Fourth, to validate the rationality of our chosen duration function, we conducted a comparative experiment on different duration functions and the same hyperparameters setting (the forecasting target  $q = 2$ , the length of rolling window  $T = 21$ ), with the results shown in Table. V. The first row shows the results without sentiment, i.e., without applying any duration function. The second row presents the results using an alternative function — Smoothing Spline (with the smoothing factor set to 16). The third row shows the results when the level of the Daubechies 4 wavelet is set to 3. It can be seen that our chosen configuration is reasonable; compared to the other two baselines, our approach yields more robust results under statistically significant  $p$ -values.

Finally, cause we demonstrated the association between sentiment and risk events from an industry-level view in Fig. 7, to illustrate this association at the firm level, especially regarding changes in composite sentiment preceding bond defaults, we selected two bonds that defaulted in the Chinese bond market and visualized their sentiment trajectories, as shown in Fig. 11. It is evident that both bonds exhibited a significant sentiment shift prior to default. Therefore, beyond the statistically significant quantitative results shown in our Table. III, Fig. 11 suggests that the composite sentiment extracted by our framework can indeed serve as an early warning indicator for the market. For the bond  $136093.SH$  issued by CEFC China Energy, in March 2018, its chairman Ye was retained by the Chinese government due to economic bribery scandals involving government officials. As the board became unable to function and related public opinion intensified, the company suspended trading of the bond and failed to fulfill its repayment obligations on time. For the bond  $031390443.IB$  issued by Sichuan Coal Industry Group, due to long-standing operational difficulties and structural changes in China's energy sector, creditors sought the reorganization through the local court in May 2015 after the company failed to repay its debts. Subsequently, the bond experienced a prolonged bearish sentiment. Although the situation temporarily improved at the end of 2015 due to a decline in the yield on 10-year government bonds, the company ultimately defaulted under continued financial strain and structural adjustment policies, accompanied by a renewed downturn in sentiment.

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/35a2bda4b4f24dc56b9a06eeb7c9543983a680cfc71131377f7148e68d698309.jpg)

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/5d69fd188fa5cbb6474979b2a63b56d87391e3ea0264fa7eb64f8918b0f90db8.jpg)  
Fig. 11: Visualization of Composite Sentiment Dynamics of Defaulted Bonds Preceding defaults. The left side of each subplot displays the bond code. "SH" indicates the Shanghai Stock Exchange, and "IB" indicates the Investment Bank.

# V. CONCLUSION

Benefits. In this work, we independently constructed a multi-source heterogeneous dataset and leveraged PLMs and LLMs to extract firm-specific and industry-specific sentiment from both the micro-level and meso-level perspectives, and aggregated them using wavelet smoothing. Empirical analysis demonstrates that the composite sentiment extracted by our framework significantly improves the forecasting of bond credit spreads of the Chinese bond market. This expands the feature sources for bond default forecasting models and provides a valuable reference for using unstructured text in the study of the financial market.

Limitations and Future Work. This work focuses solely on the Chinese bond market and selects bond default risk forecasting as the only downstream task. However, this paradigm of sentiment analysis for financial texts can be extended to other asset classes and downstream tasks in the financial market, including equities and derivatives.

# REFERENCES

[1] F. Perri and V. Quadrini, "International recessions," American Economic Review, vol. 108, no. 4-5, pp. 935-984, 2018.  
[2] M. Baker et al., "Investor sentiment and the cross-section of stock returns," The journal of Finance, vol. 61, no. 4, pp. 1645-1680, 2006.  
[3] S. Aleti and T. Bollerslev, "News and asset pricing: A high-frequency anatomy of the sdf," The Review of Financial Studies, p. hhae019, 2024.  
[4] S. Consoli, L. T. Pezzoli, and E. Tosetti, “Emotions in macroeconomic news and their impact on the european bond market,” Journal of International Money and Finance, vol. 118, p. 102472, 2021.  
[5] K. Du et al., "Financial sentiment analysis: Techniques and applications," ACM Computing Surveys, vol. 56, no. 9, pp. 1-42, 2024.  
[6] N. Ahbali, X. Liu, A. Nanda, J. Stark, A. Talukder, and R. P. Khandpur, "Identifying corporate credit risk sentiments from financial news," in Proceedings of the 2022 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies: Industry Track, 2022, pp. 362-370.  
[7] D. Ballinari and S. Behrendt, "How to gauge investor behavior? a comparison of online investor sentiment measures," Digital Finance, vol. 3, no. 2, pp. 169-204, 2021.  
[8] E. Efretuei, “Year and industry-level accounting narrative analysis: Readability and tone variation,” Journal of Emerging Technologies in Accounting, vol. 18, no. 2, pp. 53-76, 2021.  
[9] Z. Liu et al., "Emolllms: A series of emotional large language models and annotation tools for comprehensive affective analysis," in Proceedings of the 30th ACM SIGKDD Conference on Knowledge Discovery and Data Mining, 2024, pp. 5487-5496.  
[10] B. Mendel and A. Shleifer, “Chasing noise,” Journal of Financial Economics, vol. 104, no. 2, pp. 303–320, 2012.  
[11] D. Araci, “Finbert: Financial sentiment analysis with pre-trained language models,” arXiv preprint arXiv:1908.10063, 2019.  
[12] X.-Y. Liu et al., "Fingpt: Democratizing internet-scale data for financial large language models," arXiv preprint arXiv:2307.10485, 2023.  
[13] S. Wu, O. Irsoy, S. Lu, V. Dabravolski, M. Dredze, S. Gehrmann, P. Kambadur, D. Rosenberg, and G. Mann, “Bloombergggpt: A large language model for finance,” arXiv preprint arXiv:2303.17564, 2023.  
[14] J. Lee, N. Stevens, and S. C. Han, “Large language models in finance (finllms),” Neural Computing and Applications, pp. 1-15, 2025.  
[15] W. Zhang, X. Li, Y. Deng, L. Bing, and W. Lam, "A survey on aspect-based sentiment analysis: Tasks, methods, and challenges," IEEE Transactions on Knowledge and Data Engineering, vol. 35, no. 11, pp. 11019-11038, 2022.  
[16] S. Sohangir, D. Wang, A. Pomeranets, and T. M. Khoshgoftaar, “Big data: Deep learning for financial sentiment analysis,” Journal of Big Data, vol. 5, no. 1, pp. 1–25, 2018.  
[17] G. Cerci et al., "An investigation of investor sentiment and speculative bond yield spreads," in International Interdisciplinary Business-Economics Advancement Conference, 2015, p. 224.  
[18] P. Malo et al., "Good debt or bad debt: Detecting semantic orientations in economic texts," Journal of the Association for Information Science and Technology, vol. 65, no. 4, pp. 782-796, 2014.  
[19] M. Maia, S. Handschuh, A. Freitas, B. Davis, R. McDermott, M. Zarrouk, and A. Balahur, "Www'18 open challenge: financial opinion mining and question answering," in Companion proceedings of the web conference 2018, 2018, pp. 1941-1942.  
[20] R. S. Shah, K. Chawla, D. Eidnani, A. Shah, W. Du, S. Chava, N. Raman, C. Smiley, J. Chen, and D. Yang, "When flue meets flang: Benchmarks and large pre-trained language model for financial domain," arXiv preprint arXiv:2211.00083, 2022.  
[21] J. Liu, Z. Lu, and W. Du, "Combining enterprise knowledge graph and news sentiment analysis for stock price prediction," *Hawaii International Conference on System Sciences*, 2019.  
[22] T. Jochem and F. S. Peters, “Bias propagation in economically linked firms,” Available at SSRN 2698365, 2019.  
[23] J. Cao et al., "Too sensitive to fail: The impact of sentiment connectedness on stock price crash risk," Entropy, vol. 27, no. 4, p. 345, 2025.  
[24] L. A. Smales, “News sentiment and bank credit risk,” Journal of Empirical Finance, vol. 38, pp. 37–61, 2016.  
[25] M. L. Defond and J. Zhang, “The timeliness of the bond market reaction to bad earnings news,” Contemporary Accounting Research, vol. 31, no. 3, pp. 911–936, 2014.  
[26] L. Yue et al., “A survey of sentiment analysis in social media,” Knowledge and Information Systems, vol. 60, pp. 617-663, 2019.  
[27] M. Zhang, Y. Wu, W. Li, and W. Li, “Learning universal sentence representations with mean-max attention autoencoder,” arXiv preprint arXiv:1809.06590, 2018.

[28] T. Kojima, S. S. Gu, M. Reid, Y. Matsuo, and Y. Iwasawa, “Large language models are zero-shot reasoners,” Advances in neural information processing systems, vol. 35, pp. 22-199-22-213, 2022.  
[29] T. Brown, B. Mann, N. Ryder, M. Subbiah, J. D. Kaplan, P. Dhariwal, A. Neelakantan, P. Shyam, G. Sastry, A. Askell et al., "Language models are few-shot learners," Advances in neural information processing systems, vol. 33, pp. 1877-1901, 2020.  
[30] J. Wei, X. Wang, D. Schuurmans, M. Bosma, F. Xia, E. Chi, Q. V. Le, D. Zhou et al., "Chain-of-thought prompting elicits reasoning in large language models," Advances in neural information processing systems, vol. 35, pp. 24-824-24-837, 2022.  
[31] H. M. Markowitz, “Foundations of portfolio theory,” The journal of finance, vol. 46, no. 2, pp. 469–477, 1991.  
[32] D. Chong and J. N. Druckman, “Framing theory,” Annu. Rev. Polit. Sci., vol. 10, no. 1, pp. 103–126, 2007.  
[33] M. Nerlove, D. M. Grether, and J. L. Carvalho, Analysis of economic time series: a synthesis. Academic Press, 2014.  
[34] J. Faust et al., "Credit spreads as predictors of real-time economic activity: a bayesian model-averaging approach," Review of Economics and Statistics, vol. 95, no. 5, pp. 1501-1519, 2013.  
[35] P. Wang et al., "Qwen2-vl: Enhancing vision-language model's perception of the world at any resolution," arXiv preprint arXiv:2409.12191, 2024.  
[36] S. Xiao, Z. Liu, P. Zhang, and N. Muennighoff, “C-pack: Packaged resources to advance general chinese embedding,” 2023.  
[37] DeepSeek-AI, "Deepseek-r1: Incentivizing reasoning capability in llms via reinforcement learning," 2025.  
[38] K. J. Forbes and R. Rigobon, “No contagion, only interdependence: measuring stock market comovements,” The journal of Finance, vol. 57, no. 5, pp. 2223–2261, 2002.  
[39] A. Falk and A. Ichino, "Clean evidence on peer effects," Journal of labor economics, vol. 24, no. 1, pp. 39-57, 2006.  
[40] R. B. Cleveland et al., “Stl: A seasonal-trend decomposition,” J. off. Stat, vol. 6, no. 1, pp. 3-73, 1990.  
[41] M. Ojala et al., "Permutation tests for studying classifier performance." Journal of machine learning research, vol. 11, no. 6, 2010.  
[42] A. Fisher, C. Rudin, and F. Dominici, "All models are wrong, but many are useful: Learning a variable's importance by studying an entire class of prediction models simultaneously," Journal of Machine Learning Research, vol. 20, no. 177, pp. 1-81, 2019.

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/0b37040d9031831926e9015df28c2afb2bc85e16e98234a067e35856688029f9.jpg)

Yiwei Liu is an undergraduate student expected to obtain a Bachelor's degree in Software Engineering, Sichuan University, in June 2025. Currently, he is studying as a Non-Graduate-Non-Exchange student at the School of Computing, National University of Singapore. His research interests are Fintech, computer vision, and embodied AI.

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/c75e372dd6d138951c93b9caf3a3ac4fc07ddd1c5e7e16f57e5f65f9d20451a5.jpg)

Junbo Wang is currently pursuing a Bachelor of Engineering degree at the College of Software Engineering, Sichuan University, China, and is expected to graduate in June 2025. He has been admitted to the postgraduate program at Shanghai Jiao Tong University and is currently undertaking an internship there. His research interests include large language models and embodied AI.

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/df21cd281655337fc33bb60222b2769898cbc1befb0ce8b96dd38b039872e803.jpg)

Lei Long is a PhD student at School of Economics, Sichuan University, China. His main research interests include monetary theory and text analysis. He has participated in the National Natural Science Foundation of China (72371178).

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/a60e3c1eb197bd2bf3025a803a2798a4491fd05b89d3f999d0726da33b4fa3a0.jpg)

Xin Li is a PhD student at School of Economics, Sichuan University, China. His main research interests include Fintech, AiFinance, and quantitative investing. He has participated in the National Natural Science Foundation of China (72172164, 72371178) and the Natural Science Foundation of Guangdong Province (2021A1515011354).

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/fb2a5c7a63cb718ce21c16427b7598e8d6b8f5674fd5866ab79b66bfbac4bf19.jpg)

Ruiting Ma is a PhD student at School of Economics, Sichuan University, China. Her main research interests include Fintech, AiFinance. Her has participated in the National Natural Science Foundation of China (72371178).

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/665646156072955a884943c5b56cdcfb6378bfc90394324362cb8b0b9c732360.jpg)

Yuankai Wu (Senior Member, IEEE) received the Ph.D. degree from Beijing Institute of Technology (BIT), Beijing, China, in 2019. He is currently a tenure-track Professor with the College of Computer Science, Sichuan University, China. Prior to joining Sichuan University, he was an IVADO Post-Doctoral Researcher with McGill University. His research interests include spatiotemporal data mining and intelligent system.

![](https://cdn-mineru.openxlab.org.cn/result/2025-10-15/375d33d8-82b5-4315-8b8b-ca640938b85f/859e57c106bb81cd6a4c5fe1d7bdf202ddbfac78abf6b96bd8359a4895f08071.jpg)

Xuebin Chen is a professor at the School of Economics, Sichuan University, and the School of Economics, Fudan University. His research focuses on monetary theory and policy, exchange rate theory and policy, financial game analysis, quantitative investment, and intelligent finance. He has led more than ten research projects funded by the National Natural Science Foundation of China and the Social Science Foundation. He has published dozens of papers in journals such as Economic Research, Financial Research, and International Finance Research,

and has authored over ten academic monographs.

# APPENDIX

# A. Knowledge Graph  $\mathcal{G}$  And Knowledge Base  $\mathcal{B}$

Generally, the rows of the Knowledge Graph  $\mathcal{G}$  represent 40 industries, while the columns represent 117 topics. These 117 topics can be categorized as follows:

27 Economic Topics.  
11 Domestic Economic Indicators Topics.  
14 Global Economic Indicators Topics.  
12 Domestic Financial Topics.  
13 International Relations Topics.  
- 6 Natural Disasters Topics.  
10 Technological Advancements Topics.  
16 Social Developments Topics.  
- 7 Environmental Protection Topics.  
- 7 Legal Regulations Topics.

Since the entire  $\mathcal{G}$  is too large to be displayed in full, we provide an example subset, as shown in Table. VI, which illustrates the impact of 6 natural disaster topics on 40 industries. The definition of the topic Natural Disasters in the Knowledge Base  $\mathcal{B}$  is provided in the box below. The complete  $\mathcal{G}$  and  $\mathcal{B}$  can be accessed from our code repository.

TABLE VI: A Subset of The Knowledge Graph  $\mathcal{G}$  

<table><tr><td>Industry</td><td>Natural Disasters</td><td>Disaster Prevention</td><td>Disaster Expenditure</td><td>Disaster Relief</td><td>Disaster Loss</td><td>Post-Disaster Reconstruction</td></tr><tr><td>Agriculture, Forestry, Livestock, and Fishery</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Basic Chemicals</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Steel</td><td>1</td><td>1</td><td>1</td><td>0</td><td>1</td><td>1</td></tr><tr><td>Non-ferrous Metals</td><td>1</td><td>1</td><td>1</td><td>0</td><td>1</td><td>1</td></tr><tr><td>Electronics</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Automobile</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Household Appliances</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Food and Beverage</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Textiles and Apparel</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Light Industry Manufacturing</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Pharmaceuticals and Biotechnology</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Utilities</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Transportation</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Real Estate</td><td>1</td><td>1</td><td>1</td><td>0</td><td>1</td><td>1</td></tr><tr><td>Trade and Retail</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Tourism and Scenic Areas</td><td>1</td><td>1</td><td>1</td><td>0</td><td>1</td><td>1</td></tr><tr><td>Education (Including Sports)</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Local Life Services</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Professional Services</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><td>Hospitality and Catering</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Banking</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><td>Non-bank Financial Services</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><td>Building Materials</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Building Decoration</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Electrical Equipment</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Machinery and Equipment</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Defense and Military Industry</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td></tr><tr><td>Computer</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Television and Broadcasting</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Gaming</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><td>Advertising and Marketing</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><td>Film and Cinema</td><td>1</td><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td></tr><tr><td>Digital Media</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><td>Social Media</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><td>Publishing</td><td>1</td><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td></tr><tr><td>Telecommunications</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Coal</td><td>1</td><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td></tr><tr><td>Petroleum and Petrochemicals</td><td>1</td><td>1</td><td>0</td><td>1</td><td>1</td><td>0</td></tr><tr><td>Environmental Protection</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>Beauty and Personal Care</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></table>

- 1 represents that topic  $n$  has an impact on industry  $m$ , while 0 indicates no impact.  
Natural disaster news refers to reports on the occurrence, impact, response, and recovery of natural disasters, aiming to provide timely and accurate information to help readers understand the current situation and effects of disasters. Its content includes basic information about the disaster, cause analysis, and warning information, as well as the loss of life, property, social and economic impacts, government and social rescue actions, post-disaster reconstruction, early warning systems, and emergency plans. It also covers meteorological and geological analysis, historical data and real-time data, major events, international responses, media reports, public opinions, expert analysis, and ethical controversies. Natural disaster news is not only important for general readers but also provides valuable references for policymakers, international organizations, and others. Accuracy and timeliness are crucial.

# B. Feature Set

The dependent variable of the BDRF model  $f_{4}$  is the credit spread, while the independent variables include the numeric features listed in Table. VII and the extracted sentiment. All numeric independent variables are z-score normalized before being input into the BDRF model  $f_{4}$ . In  $\mathcal{D}_3$ , there are 47 bonds rated below A, 407 defaulted bonds, and 6,018 matured firm bonds, totaling 6,472 bonds.

# C. Feature Attribution

Table. VIII lists the importance and forecasting contribution ratio of each independent variable feature in the BDRF model  $f_{4}^{*}$  forecasting process, sorted in descending order. The importance is evaluated by randomly permuting the positions of independent variable features [42].

# D. Prompt

The box on the last page demonstrates how to interact with the GPT agent using Chain-of-Thought and few-shot learning to obtain meso-level sentiment.

TABLE VII: Feature Set.  

<table><tr><td>Dimension</td><td>Feature Name</td></tr><tr><td>Macroeconomic and Financial Indicators</td><td>1. USDCNYC
2. Shibor (Shanghai Interbank Offered Rate) in March
3. Manufacturing PMI (Purchasing Managers' Index)
4. Macroeconomic Prosperity Index: Leading Index
5. PPI (Producer Price Index): Year-over-Year for the Current Month
6. GDP (Gross Domestic Product): Year-over-Year for the Current Quarter
7. CPI (Consumer Price Index): Year-over-Year for the Current Month
8. Aggregate Financing to the Real Economy (AFRE): Year-over-Year at Period-End
9. Yield on Government Bonds (for the Corre-sponding Period)</td></tr><tr><td>Industrial Indicator</td><td>10. SWS³ Primary Industry Index</td></tr><tr><td>Trading Indicator</td><td>11. Trading Volume</td></tr><tr><td>Firm Financial and Operational Indicators</td><td>12. Operating Revenue
13. Operating Costs
14. Total Profit
15. Current Assets</td></tr><tr><td></td><td>16. Non-Current Assets
17. Total Assets
18. Current Liabilities
19. Non-Current Liabilities
20. Total Liabilities
21. Total Shareholders' Equity
22. Cash Flow from Operations
23. Cash Flow from Investment
24. Cash Flow from Finance
25. Total Cash Flow
26. Current Ratio
27. Quick Ratio
28. Super Quick Ratio
29. Debt-to-Account Ratio (%)</td></tr><tr><td>Firm Financial and Operational Indicators</td><td>30. Equity Ratio (%) 
31. Tangible Net Worth Debt Ratio (%) 
32. Gross Profit Margin (%) 
33. Net Profit Margin (%) 
34. Return on Assets (%) 
35. Operating Profit Margin (%) 
36. Average Return on Equity (%) 
37. Operating Cycle (Days) 
38. Inventory Turnover Ratio 
39. Accounts Receivable Turnover Ratio 
40. Current Asset Turnover Ratio 
41. Shareholders' Equity Turnover Ratio 
42. Total Asset Turnover Ratio</td></tr><tr><td>Firm Comprehensive Credit Indicators</td><td>43. Remaining Credit Utilization Ratio
44. Month-over-Month Change in Credit
45. Secured Credit Ratio</td></tr></table>

TABLE VIII: Feature Attribution.  

<table><tr><td>Feature Name</td><td>Feature Importance</td></tr><tr><td>1: PPI</td><td>0.05599892602199476</td></tr><tr><td>2: Macroeconomic Climate Index</td><td>0.05008474777898123</td></tr><tr><td>3: AFRE</td><td>0.048741595825980824</td></tr><tr><td>4: Yield on Government Bonds</td><td>0.04777380830739202</td></tr><tr><td>5: Shibor</td><td>0.04202742096446867</td></tr><tr><td>6: CPI</td><td>0.03426918656953126</td></tr><tr><td>7: GDP</td><td>0.024902612696883587</td></tr><tr><td>8: Cash Flow from Finance</td><td>0.023586526180286515</td></tr><tr><td>9: Manufacturing PMI</td><td>0.022554323742137495</td></tr><tr><td>10: USDCNYC</td><td>0.017421353277869984</td></tr><tr><td>11: Total Asset Turnover Ratio</td><td>0.016773429134312498</td></tr><tr><td>12: Return on Assets</td><td>0.013167433864527414</td></tr><tr><td>13: Total Cash Flow</td><td>0.010537711967037596</td></tr><tr><td>14: Cash Flow from Investment</td><td>0.008872511265766582</td></tr><tr><td>15: Remaining Credit Utilization Ratio</td><td>0.00838505541576473</td></tr><tr><td>16: Current Ratio</td><td>0.008380998325133737</td></tr><tr><td>17: Sentiment</td><td>0.008268740522892847</td></tr><tr><td>18: Current Asset Turnover Ratio</td><td>0.007556228501431426</td></tr><tr><td>19: SWS Primary Industry Index</td><td>0.007512512820364697</td></tr><tr><td>20: Super Quick Ratio</td><td>0.007150048651024073</td></tr><tr><td>21: Shareholders’ Equity Turnover Ratio</td><td>0.006558091767532665</td></tr><tr><td>22: Total Shareholders’ Equity</td><td>0.006398215943515894</td></tr><tr><td>23: Cash Flow from Operations</td><td>0.00609119415065037</td></tr><tr><td>24: Debt-to-Asset Ratio</td><td>0.005764414957338115</td></tr><tr><td>25: Non-Current Liabilities</td><td>0.005377152453926447</td></tr><tr><td>26: Quick Ratio</td><td>0.005087716463639998</td></tr><tr><td>27: Operating Costs</td><td>0.004967130897281532</td></tr><tr><td>28: Current Assets</td><td>0.004729885882607893</td></tr><tr><td>29: Total Profit</td><td>0.004242905231156374</td></tr><tr><td>30: Equity Ratio</td><td>0.0041352546569015155</td></tr><tr><td>31: Trading Volume</td><td>0.003781201374037846</td></tr><tr><td>32: Operating Revenue</td><td>0.003794565139728852</td></tr><tr><td>33: Operating Profit Margin</td><td>0.003640317594096572</td></tr><tr><td>34: Average Return on Equity</td><td>0.002713547459396221</td></tr><tr><td>35: Operating Cycle</td><td>0.0019902378793583597</td></tr><tr><td>36: Tangible Net Worth Debt Ratio</td><td>0.001773556323910794</td></tr><tr><td>37: Non-Current Assets</td><td>0.0012569254454672025</td></tr></table>

<table><tr><td>38: Current Liabilities</td><td>0.0010543009793960243</td></tr><tr><td>39: Gross Profit Margin</td><td>0.000877351203257241</td></tr><tr><td>40: Total Assets</td><td>0.0007847072011357649</td></tr><tr><td>41: Secured Credit Ratio</td><td>0.0006166506979297559</td></tr><tr><td>42: Total Liabilities</td><td>0.00043087517032615086</td></tr><tr><td>43: Accounts Receivable Turnover Ratio</td><td>0.00035094798939748516</td></tr><tr><td>44: Month-over-Month Change in Credit</td><td>0.00016757408467568303</td></tr><tr><td>45: Net Profit Margin</td><td>0.00013639526310798146</td></tr><tr><td>46: Inventory Turnover Ratio</td><td>1.7297315695033296e-08</td></tr></table>

# **Task Description:**

You are a professional bond market analysis expert. You will receive a series of texts related to the bond market. Your task is to determine the sentiment for each text based on its content. The sentiment has three discrete labels:

1. Pessimistic (-1): The text describes factors reflecting negative market sentiment in macro-financial contexts, particularly the bond market. These include concerns about economic fundamentals (such as slowdowns or rising unemployment), expectations of tighter monetary policy and higher interest rates, reduced market liquidity, and risk events like defaults or downgrades.

2. Neutral (0): The text describes neutral market sentiment, characterized by stable economic fundamentals, unchanged monetary policy with priced-in expectations, balanced market liquidity, and absence of major risk events. The content is mostly unrelated to macro financial markets, especially the bond market.

3. Optimistic (1): The text reflects positive market sentiment, with mentions of stronger economic fundamentals, expectations of rate cuts or accommodative policy, ample liquidity, and easing risk events such as debt relief or rating upgrades. It is related to macro financial markets, particularly the bond market. **Output Requirements:**

- a) First, identify the subject of the news and determine whether it is related to the bond market, economic fundamentals, interest rate policies, market liquidity, etc.

- b) Then, judge whether the news contains positive, negative, or neutral market factors.

- c) Combine the keywords (e.g., 'improvement', 'rise' = 1; 'deterioration', 'default' = -1; 'stable', 'in line with expectations' = 0) to make the final judgment.

- d) Finally, return a single sentiment score with values in -1, 0, 1.

- e) Do not output any additional content or explanations. Below are some examples of input-output cases:

# **Example 1:**

Input: The Minister of Industry and Information Technology, Jin Zhuanglong, stated at the 2023 China Pharmaceutical Industry Development Conference that China has over 10,000 large pharmaceutical enterprises, contributing  $4\%$  of industrial added value and producing  $40\%$  of global bulk raw materials. China ranks second globally in new drug research, with many innovative drugs, key vaccines, traditional Chinese medicine preparations, and high-end medical devices approved, strengthening supply security and supporting public health and COVID-19 response.

Thought Process: The government published positive data about the pharmaceutical industry, reflecting an overall positive market outlook.

# Output: 1

# **Example 2:**

Input: Shanghai Pudong Police Station issued the first batch of unmanned driving equipment identification plates, designed in light blue and white, with a regional abbreviation, letters, and numbers, marked "unmanned equipment" at the top. Some citizens linked it to autonomous vehicles. On November 15, Pudong authorities and enterprises clarified that it applies to low-speed unmanned delivery equipment, not autonomous cars.

Thought Process: The government issued the unmanned driving equipment identification plate, but the clarification means the management is strengthened, and not as anticipated by the public. The news is balanced and neutral. Output: 0

# **Example 3:**

Input: The Shanghai Central Meteorological Observatory issued a blue wind warning at 08:20 on November 17, 2024, forecasting strong cold air with maximum gusts of 7-8 in inland areas and 8-9 along the river and coastal areas in the next 24 hours.

Thought Process: Extreme weather events are expected, which may disrupt production and daily life, leading to a negative market outlook.

# Output: -1