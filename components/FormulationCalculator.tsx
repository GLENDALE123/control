import React, { useState, useMemo, FC, ChangeEvent } from 'react';

const FormulationCalculator: FC = () => {
    const [activeTab, setActiveTab] = useState('ratio');
    
    // State for Ratio Calculator
    const [baseWeight1, setBaseWeight1] = useState('10000');
    const [totalPercent, setTotalPercent] = useState('2.9');
    const [ratios, setRatios] = useState(['3.5', '1']);
    const [ratioResults, setRatioResults] = useState<string | null>(null);

    // State for Percent Calculator
    const [baseWeight2, setBaseWeight2] = useState('8000');
    const [percentages, setPercentages] = useState(['3', '0.35', '0.12']);
    const [percentResults, setPercentResults] = useState<string | null>(null);

    // State for Reblend Calculator
    const [remainingWeight, setRemainingWeight] = useState('10500');
    const [currentRatio1, setCurrentRatio1] = useState('2');
    const [currentRatio2, setCurrentRatio2] = useState('1');
    const [currentPercent, setCurrentPercent] = useState('1.9');
    const [newRatio1, setNewRatio1] = useState('1');
    const [newRatio2, setNewRatio2] = useState('1');
    const [newPercent, setNewPercent] = useState('0.8');
    const [reblendResults, setReblendResults] = useState<string | null>(null);

    // State for Coating Reblend Calculator
    const [initialBase, setInitialBase] = useState('5000');
    const [initialPercent, setInitialPercent] = useState('5');
    const [currentWeight, setCurrentWeight] = useState('3880');
    const [targetPercent, setTargetPercent] = useState('3');
    const [coatingResults, setCoatingResults] = useState<string | null>(null);

    const [copySuccess, setCopySuccess] = useState(false);

    const showTab = (tabName: string) => {
        setActiveTab(tabName);
    };

    const handleRatioChange = (index: number, value: string) => {
        const newRatios = [...ratios];
        newRatios[index] = value;
        setRatios(newRatios);
    };

    const addRatioInput = () => {
        setRatios([...ratios, '']);
    };

    const removeRatioInput = (index: number) => {
        setRatios(ratios.filter((_, i) => i !== index));
    };
    
    const handlePercentageChange = (index: number, value: string) => {
        const newPercentages = [...percentages];
        newPercentages[index] = value;
        setPercentages(newPercentages);
    };
    
    const addPercentInput = () => {
        setPercentages([...percentages, '']);
    };
    
    const removePercentInput = (index: number) => {
        setPercentages(percentages.filter((_, i) => i !== index));
    };

    const calculateRatio = () => {
        const base = parseFloat(baseWeight1);
        const totalP = parseFloat(totalPercent);
        if (isNaN(base) || isNaN(totalP)) {
            alert('기준중량과 전체 비율을 입력해주세요.');
            return;
        }
        const totalWeight = base * (totalP / 100);
        const ratioValues = ratios.map(r => parseFloat(r)).filter(v => !isNaN(v));
        const totalRatio = ratioValues.reduce((sum, r) => sum + r, 0);

        if (totalRatio === 0) {
             alert('비율을 1개 이상 입력해주세요.');
             return;
        }

        let resultHtml = '';
        let calculatedTotal = 0;
        ratioValues.forEach((ratio, index) => {
            const weight = (ratio / totalRatio) * totalWeight;
            resultHtml += `<div class="result-item"><span>${index + 1}번 (비율: ${ratio})</span><span class="result-value">${weight.toFixed(2)} g</span></div>`;
            calculatedTotal += weight;
        });
        resultHtml += `<div class="result-item total-row"><span>총 중량</span><span class="result-value">${calculatedTotal.toFixed(2)} g (${totalP}%)</span></div>`;
        setRatioResults(resultHtml);
    };
    
    const calculatePercent = () => {
        const base = parseFloat(baseWeight2);
        if (isNaN(base)) {
            alert('기준중량을 입력해주세요.');
            return;
        }
        const percentValues = percentages.map(p => parseFloat(p)).filter(v => !isNaN(v));
        let resultHtml = '';
        let totalWeight = 0;
        let totalP = 0;
        percentValues.forEach((percent, index) => {
            const weight = base * (percent / 100);
            resultHtml += `<div class="result-item"><span>${index + 1}번 (${percent}%)</span><span class="result-value">${weight.toFixed(2)} g</span></div>`;
            totalWeight += weight;
            totalP += percent;
        });
        resultHtml += `<div class="result-item total-row"><span>총 안료 중량</span><span class="result-value">${totalWeight.toFixed(2)} g (${totalP.toFixed(2)}%)</span></div>`;
        setPercentResults(resultHtml);
    };

    const calculateReblend = () => {
        // 1. Parse all inputs and validate
        const remainingW = parseFloat(remainingWeight);
        const currentR1 = parseFloat(currentRatio1);
        const currentR2 = parseFloat(currentRatio2);
        const currentP = parseFloat(currentPercent);
        const newR1 = parseFloat(newRatio1);
        const newR2 = parseFloat(newRatio2);
        const newP = parseFloat(newPercent);
    
        if ([remainingW, currentR1, currentR2, currentP, newR1, newR2, newP].some(isNaN)) {
            alert('모든 값을 올바르게 입력해주세요.');
            return;
        }
        if (newR1 < 0 || newR2 < 0) {
            alert('비율 값은 0 이상이어야 합니다.');
            return;
        }
        if (newP <= 0 || newP >= 100) {
            alert('새로운 목표 퍼센트는 0과 100 사이여야 합니다.');
            return;
        }
    
        // 2. Analyze current mixture
        const currentBaseWeight = remainingW * (100 - currentP) / 100;
        const currentPigmentWeight = remainingW - currentBaseWeight;
        const currentTotalRatio = currentR1 + currentR2;
        const currentComponent1 = currentTotalRatio > 0 ? currentPigmentWeight * (currentR1 / currentTotalRatio) : 0;
        const currentComponent2 = currentTotalRatio > 0 ? currentPigmentWeight * (currentR2 / currentTotalRatio) : 0;
    
        // 3. Calculate final pigment weights based on new ratio, adding only what's necessary
        let finalComponent1 = 0;
        let finalComponent2 = 0;
        const newTotalRatio = newR1 + newR2;
    
        if (newTotalRatio <= 0) {
            alert('새로운 목표 비율의 합은 0보다 커야 합니다.');
            return;
        }
    
        if (newR1 === 0) {
            finalComponent1 = 0;
            finalComponent2 = currentComponent2;
        } else if (newR2 === 0) {
            finalComponent2 = 0;
            finalComponent1 = currentComponent1;
        } else if (currentComponent1 * newR2 >= currentComponent2 * newR1) {
            finalComponent1 = currentComponent1;
            finalComponent2 = currentComponent1 * (newR2 / newR1);
        } else {
            finalComponent2 = currentComponent2;
            finalComponent1 = currentComponent2 * (newR1 / newR2);
        }
        
        const finalPigmentWeight = finalComponent1 + finalComponent2;
    
        // 4. Calculate final base weight based on new concentration
        const finalBaseWeight = finalPigmentWeight * (100 - newP) / newP;
        
        // 5. Calculate additions needed for each component
        const additionalComponent1 = finalComponent1 - currentComponent1;
        const additionalComponent2 = finalComponent2 - currentComponent2;
        const additionalBase = finalBaseWeight - currentBaseWeight;
        
        // 6. Calculate final totals
        const finalTotal = finalBaseWeight + finalPigmentWeight;
    
        // 7. Generate results HTML
        let resultHtml = `<h4>현재 배합물 분석</h4>
            <div class="result-item"><span>현재 총 중량</span><span class="result-value">${remainingW.toFixed(2)} g</span></div>
            <div class="result-item"><span>주제 (기본 재료)</span><span class="result-value">${currentBaseWeight.toFixed(2)} g</span></div>
            <div class="result-item"><span>성분 1 (비율 ${currentR1})</span><span class="result-value">${currentComponent1.toFixed(2)} g</span></div>
            <div class="result-item"><span>성분 2 (비율 ${currentR2})</span><span class="result-value">${currentComponent2.toFixed(2)} g</span></div>
            <div class="result-item"><span>현재 비율</span><span class="result-value">${currentR1} : ${currentR2} - ${currentP}%</span></div>
            <h4>추가해야 할 원료</h4>`;
        
        const hasAddition = additionalBase > 0.005 || additionalComponent1 > 0.005 || additionalComponent2 > 0.005;
    
        if(hasAddition) {
            if(additionalBase > 0.005) resultHtml += `<div class="addition-card base-material"><div class="material-name">주제 (기본 재료)</div><div class="material-action">추가할 중량</div><div class="material-weight">+${additionalBase.toFixed(2)} g</div></div>`;
            if(additionalComponent1 > 0.005) resultHtml += `<div class="addition-card component-1"><div class="material-name">성분 1</div><div class="material-action">추가할 중량</div><div class="material-weight">+${additionalComponent1.toFixed(2)} g</div></div>`;
            if(additionalComponent2 > 0.005) resultHtml += `<div class="addition-card component-2"><div class="material-name">성분 2</div><div class="material-action">추가할 중량</div><div class="material-weight">+${additionalComponent2.toFixed(2)} g</div></div>`;
        } else {
             resultHtml += `<div class="result-item" style="background-color: #ffebee; padding: 15px; border-radius: 5px;"><span style="color: #c62828;"><strong>추가할 원료가 없습니다. 이미 목표 배합입니다.</strong></span></div>`;
        }
        
        resultHtml += `<h4>최종 배합 구성</h4>
            <div class="result-item"><span>주제 (기본 재료)</span><span class="result-value">${finalBaseWeight.toFixed(2)} g</span></div>
            <div class="result-item"><span>성분 1</span><span class="result-value">${finalComponent1.toFixed(2)} g</span></div>
            <div class="result-item"><span>성분 2</span><span class="result-value">${finalComponent2.toFixed(2)} g</span></div>
            <div class="result-item total-row"><span>최종 총 중량</span><span class="result-value">${finalTotal.toFixed(2)} g</span></div>
            <div class="result-item"><span>최종 비율</span><span class="result-value">${newR1} : ${newR2} - ${newP}%</span></div>`;
    
        setReblendResults(resultHtml);
    };

    const calculateCoating = () => {
        const initialB = parseFloat(initialBase);
        const initialP = parseFloat(initialPercent);
        const currentW = parseFloat(currentWeight);
        const targetP = parseFloat(targetPercent);
        if (isNaN(initialB) || isNaN(initialP) || isNaN(currentW) || isNaN(targetP)) {
            alert('모든 값을 입력해주세요.');
            return;
        }

        const initialPigmentWeight = initialB * (initialP / 100);
        const initialTotalWeight = initialB + initialPigmentWeight;
        const usedWeight = initialTotalWeight - currentW;
        const remainingRatio = currentW / initialTotalWeight;
        const currentBase = initialB * remainingRatio;
        const currentPigment = initialP > 0 ? initialPigmentWeight * remainingRatio : 0;
        let additionalBase = 0;
        let additionalPigment = 0;
        let targetTotalWeight = currentW;

        if (targetP > initialP) {
            additionalPigment = (currentBase * targetP / (100 - targetP)) - currentPigment;
            targetTotalWeight = currentW + additionalPigment;
        } else if (targetP < initialP) {
            additionalBase = (currentPigment * (100 - targetP) / targetP) - currentBase;
            targetTotalWeight = currentW + additionalBase;
        }
        
        let resultHtml = `<h4>현재 남은 배합물 분석</h4>
            <div class="result-item"><span>사용한 양</span><span class="result-value">${usedWeight.toFixed(2)} g</span></div>
            <div class="result-item"><span>남은 주제</span><span class="result-value">${currentBase.toFixed(2)} g</span></div>
            <div class="result-item"><span>남은 안료</span><span class="result-value">${currentPigment.toFixed(2)} g</span></div>
            <div class="result-item"><span>현재 비율</span><span class="result-value">${initialP}%</span></div>
            <h4>추가해야 할 원료</h4>`;

        if (additionalPigment > 0.005) {
            resultHtml += `<div class="addition-card pigment"><div class="material-name">안료</div><div class="material-action">추가할 중량</div><div class="material-weight">+${additionalPigment.toFixed(2)} g</div></div>`;
        } else if (additionalBase > 0.005) {
            resultHtml += `<div class="addition-card base-material"><div class="material-name">주제 (기본 재료)</div><div class="material-action">추가할 중량</div><div class="material-weight">+${additionalBase.toFixed(2)} g</div></div>`;
        } else {
            resultHtml += `<div class="result-item"><span>추가 불필요 (이미 목표 비율)</span></div>`;
        }
        
        resultHtml += `<h4>최종 배합</h4>
            <div class="result-item"><span>최종 주제</span><span class="result-value">${(currentBase + additionalBase).toFixed(2)} g</span></div>
            <div class="result-item"><span>최종 안료</span><span class="result-value">${(currentPigment + additionalPigment).toFixed(2)} g</span></div>
            <div class="result-item total-row"><span>최종 총 중량</span><span class="result-value">${targetTotalWeight.toFixed(2)} g</span></div>
            <div class="result-item"><span>최종 비율</span><span class="result-value">${targetP}%</span></div>`;

        setCoatingResults(resultHtml);
    };

    const copyResults = (type: string) => {
        let resultDivId;
        switch(type) {
            case 'ratio': resultDivId = 'ratioResults'; break;
            case 'percent': resultDivId = 'percentResults'; break;
            case 'reblend': resultDivId = 'reblendResults'; break;
            case 'coating': resultDivId = 'coatingResults'; break;
            default: return;
        }

        const resultDiv = document.getElementById(resultDivId);
        if (!resultDiv) return;

        const resultItems = resultDiv.querySelectorAll('.result-item, .addition-card, h4');
        let textToCopy = '안료 배합 계산 결과\n\n';
        resultItems.forEach(item => {
            if(item.tagName === 'H4') {
                textToCopy += `\n--- ${item.textContent} ---\n`;
            } else if (item.classList.contains('addition-card')) {
                const name = item.querySelector('.material-name')?.textContent;
                const weight = item.querySelector('.material-weight')?.textContent;
                if (name && weight) textToCopy += `추가할 ${name}: ${weight}\n`;
            } else {
                const label = item.querySelector('span:first-child')?.textContent;
                const value = item.querySelector('.result-value')?.textContent;
                if(label && value) textToCopy += `${label}: ${value}\n`;
            }
        });
        
        navigator.clipboard.writeText(textToCopy.trim()).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }).catch(err => {
            alert('복사에 실패했습니다.');
        });
    };
    
    // Reset and Clear functions
    const resetRatio = () => {
        setBaseWeight1('10000'); setTotalPercent('2.9'); setRatios(['3.5', '1']); setRatioResults(null);
    };
    const clearRatio = () => {
        setBaseWeight1(''); setTotalPercent(''); setRatios(['', '']); setRatioResults(null);
    };
    const resetPercent = () => {
        setBaseWeight2('8000'); setPercentages(['3', '0.35', '0.12']); setPercentResults(null);
    };
    const clearPercent = () => {
        setBaseWeight2(''); setPercentages(['', '', '']); setPercentResults(null);
    };
    const resetReblend = () => {
        setRemainingWeight('10500'); setCurrentRatio1('2'); setCurrentRatio2('1'); setCurrentPercent('1.9');
        setNewRatio1('1'); setNewRatio2('1'); setNewPercent('0.8'); setReblendResults(null);
    };
    const clearReblend = () => {
        setRemainingWeight(''); setCurrentRatio1(''); setCurrentRatio2(''); setCurrentPercent('');
        setNewRatio1(''); setNewRatio2(''); setNewPercent(''); setReblendResults(null);
    };
    const resetCoating = () => {
        setInitialBase('5000'); setInitialPercent('5'); setCurrentWeight('3880'); setTargetPercent('3'); setCoatingResults(null);
    };
    const clearCoating = () => {
        setInitialBase(''); setInitialPercent(''); setCurrentWeight(''); setTargetPercent(''); setCoatingResults(null);
    };
    
    return (
        <>
            <div className="w-full h-full bg-white dark:bg-slate-800 p-4 md:p-8 rounded-lg shadow-lg text-slate-800 dark:text-slate-200 flex flex-col">
                <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center flex-shrink-0">안료 배합 계산기</h1>

                <div className="tab-buttons border-b-2 border-slate-200 dark:border-slate-700 mb-6 flex-shrink-0">
                    <button className={`tab-button ${activeTab === 'ratio' ? 'active' : ''}`} onClick={() => showTab('ratio')}>비율 계산</button>
                    <button className={`tab-button ${activeTab === 'percent' ? 'active' : ''}`} onClick={() => showTab('percent')}>퍼센트 계산</button>
                    <button className={`tab-button ${activeTab === 'reblend' ? 'active' : ''}`} onClick={() => showTab('reblend')}>증착 재배합</button>
                    <button className={`tab-button ${activeTab === 'coating' ? 'active' : ''}`} onClick={() => showTab('coating')}>코팅 재배합</button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {/* Ratio Calculator */}
                    <div id="ratioTab" className={`calculator-section ${activeTab === 'ratio' ? 'active' : ''}`}>
                        <div className="content-wrapper flex-col md:flex-row">
                            <div className="input-section">
                                <h2 className="text-xl font-semibold mb-4">비율 계산</h2>
                                <p className="help-text text-sm mb-4">예: 3.5 : 1 비율로 전체 2.9% 배합</p>
                                <div className="input-group mb-4">
                                    <label>기준중량 (g)</label>
                                    <input type="number" value={baseWeight1} onChange={e => setBaseWeight1(e.target.value)} placeholder="예: 10000" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"/>
                                </div>
                                <div className="input-group mb-4">
                                    <label>전체 비율 (%)</label>
                                    <input type="number" value={totalPercent} onChange={e => setTotalPercent(e.target.value)} step="0.01" placeholder="예: 2.9" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"/>
                                </div>
                                <div id="ratioInputs">
                                    <label className="mb-2 block">비율 입력</label>
                                    {ratios.map((ratio, index) => (
                                        <div key={index} className="ratio-inputs flex items-center gap-2 mb-2">
                                            <span className="number-label">{index + 1}.</span>
                                            <input type="number" step="0.01" value={ratio} onChange={e => handleRatioChange(index, e.target.value)} placeholder="비율" className="w-20 p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                            {index > 1 && <button className="btn btn-remove" onClick={() => removeRatioInput(index)}>삭제</button>}
                                        </div>
                                    ))}
                                </div>
                                <button className="btn btn-add w-full mt-2" onClick={addRatioInput}>+ 비율 추가</button>
                                <div className="button-group mt-4">
                                    <button className="btn" onClick={calculateRatio}>계산하기</button>
                                    <button className="btn btn-clear" onClick={clearRatio}>입력초기화</button>
                                    <button className="btn btn-reset" onClick={resetRatio}>예시값</button>
                                </div>
                            </div>
                            <div className="result-section">
                                <h3 className="text-lg font-semibold mb-4">계산 결과</h3>
                                <div id="ratioResults" dangerouslySetInnerHTML={{ __html: ratioResults || '<div class="no-result">계산 버튼을 눌러주세요</div>' }}></div>
                                {ratioResults && <button className="btn btn-copy mt-4" id="ratioCopyBtn" onClick={() => copyResults('ratio')}>결과 복사하기</button>}
                            </div>
                        </div>
                    </div>

                    {/* Percent Calculator */}
                    <div id="percentTab" className={`calculator-section ${activeTab === 'percent' ? 'active' : ''}`}>
                         <div className="content-wrapper flex-col md:flex-row">
                            <div className="input-section">
                                <h2 className="text-xl font-semibold mb-4">퍼센트 계산</h2>
                                <p className="help-text text-sm mb-4">예: 3%, 0.35%, 0.12% 개별 계산</p>
                                <div className="input-group mb-4">
                                    <label>기준중량 (g)</label>
                                    <input type="number" value={baseWeight2} onChange={e => setBaseWeight2(e.target.value)} placeholder="예: 8000" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                </div>
                                 <div id="percentInputs">
                                    <label className="mb-2 block">퍼센트 입력</label>
                                    {percentages.map((p, index) => (
                                        <div key={index} className="percent-input-row flex items-center gap-2 mb-2">
                                            <span className="number-label">{index+1}.</span>
                                            <input type="number" step="0.01" value={p} onChange={e => handlePercentageChange(index, e.target.value)} placeholder="%" className="w-24 p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                            <span>%</span>
                                            <button className="btn btn-remove" onClick={() => removePercentInput(index)}>삭제</button>
                                        </div>
                                    ))}
                                </div>
                                <button className="btn btn-add w-full mt-2" onClick={addPercentInput}>+ 퍼센트 추가</button>
                                <div className="button-group mt-4">
                                    <button className="btn" onClick={calculatePercent}>계산하기</button>
                                    <button className="btn btn-clear" onClick={clearPercent}>입력초기화</button>
                                    <button className="btn btn-reset" onClick={resetPercent}>예시값</button>
                                </div>
                            </div>
                            <div className="result-section">
                                 <h3 className="text-lg font-semibold mb-4">계산 결과</h3>
                                 <div id="percentResults" dangerouslySetInnerHTML={{ __html: percentResults || '<div class="no-result">계산 버튼을 눌러주세요</div>' }}></div>
                                 {percentResults && <button className="btn btn-copy mt-4" id="percentCopyBtn" onClick={() => copyResults('percent')}>결과 복사하기</button>}
                            </div>
                        </div>
                    </div>
                    
                    {/* Reblend Calculator */}
                     <div id="reblendTab" className={`calculator-section ${activeTab === 'reblend' ? 'active' : ''}`}>
                        <div className="content-wrapper flex-col md:flex-row">
                            <div className="input-section">
                                 <h2 className="text-xl font-semibold mb-4">증착 재배합 계산</h2>
                                 <p className="help-text text-sm mb-4">예: 2:1-1.9%로 배합된 10500g을 1:1-0.8%로 재조정</p>
                                 <div className="input-group mb-4">
                                    <label>현재 남은 배합물 총 중량 (g)</label>
                                    <input type="number" value={remainingWeight} onChange={e => setRemainingWeight(e.target.value)} placeholder="예: 10500" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                </div>
                                <div className="input-group mb-4">
                                    <label>현재 배합 비율과 퍼센트</label>
                                    <div className="ratio-inputs flex items-center gap-2">
                                        <input type="number" value={currentRatio1} onChange={e => setCurrentRatio1(e.target.value)} step="0.01" placeholder="비율1" className="w-20 p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                        <span className="colon">:</span>
                                        <input type="number" value={currentRatio2} onChange={e => setCurrentRatio2(e.target.value)} step="0.01" placeholder="비율2" className="w-20 p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                        <span className="mx-2">-</span>
                                        <input type="number" value={currentPercent} onChange={e => setCurrentPercent(e.target.value)} step="0.01" placeholder="%" className="w-20 p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                        <span>%</span>
                                    </div>
                                </div>
                                <div className="input-group mb-4">
                                    <label>새로운 목표 비율과 퍼센트</label>
                                     <div className="ratio-inputs flex items-center gap-2">
                                        <input type="number" value={newRatio1} onChange={e => setNewRatio1(e.target.value)} step="0.01" placeholder="비율1" className="w-20 p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                        <span className="colon">:</span>
                                        <input type="number" value={newRatio2} onChange={e => setNewRatio2(e.target.value)} step="0.01" placeholder="비율2" className="w-20 p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                        <span className="mx-2">-</span>
                                        <input type="number" value={newPercent} onChange={e => setNewPercent(e.target.value)} step="0.01" placeholder="%" className="w-20 p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                        <span>%</span>
                                    </div>
                                </div>
                                 <div className="button-group mt-4">
                                    <button className="btn" onClick={calculateReblend}>재배합 계산하기</button>
                                    <button className="btn btn-clear" onClick={clearReblend}>입력초기화</button>
                                    <button className="btn btn-reset" onClick={resetReblend}>예시값</button>
                                </div>
                            </div>
                             <div className="result-section">
                                 <h3 className="text-lg font-semibold mb-4">계산 결과</h3>
                                 <div id="reblendResults" dangerouslySetInnerHTML={{ __html: reblendResults || '<div class="no-result">계산 버튼을 눌러주세요</div>' }}></div>
                                 {reblendResults && <button className="btn btn-copy mt-4" id="reblendCopyBtn" onClick={() => copyResults('reblend')}>결과 복사하기</button>}
                            </div>
                        </div>
                    </div>

                    {/* Coating Reblend Calculator */}
                     <div id="coatingTab" className={`calculator-section ${activeTab === 'coating' ? 'active' : ''}`}>
                        <div className="content-wrapper flex-col md:flex-row">
                            <div className="input-section">
                                <h2 className="text-xl font-semibold mb-4">코팅 재배합 계산</h2>
                                <p className="help-text text-sm mb-4">예: 5%로 배합된 3880g을 3%로 재조정</p>
                                 <div className="input-group mb-4">
                                    <label>초기 주제(기준중량) (g)</label>
                                    <input type="number" value={initialBase} onChange={e => setInitialBase(e.target.value)} placeholder="예: 5000" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                </div>
                                <div className="input-group mb-4">
                                    <label>초기 비율 (%)</label>
                                    <input type="number" value={initialPercent} onChange={e => setInitialPercent(e.target.value)} step="0.01" placeholder="예: 5" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                </div>
                                <div className="input-group mb-4">
                                    <label>현재 남은 총 중량 (g)</label>
                                    <input type="number" value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} placeholder="예: 3880" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                </div>
                                <div className="input-group mb-4">
                                    <label>목표 비율 (%)</label>
                                    <input type="number" value={targetPercent} onChange={e => setTargetPercent(e.target.value)} step="0.01" placeholder="예: 3" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                                </div>
                                <div className="button-group mt-4">
                                    <button className="btn" onClick={calculateCoating}>코팅 재배합 계산하기</button>
                                    <button className="btn btn-clear" onClick={clearCoating}>입력초기화</button>
                                    <button className="btn btn-reset" onClick={resetCoating}>예시값</button>
                                </div>
                            </div>
                            <div className="result-section">
                                 <h3 className="text-lg font-semibold mb-4">계산 결과</h3>
                                 <div id="coatingResults" dangerouslySetInnerHTML={{ __html: coatingResults || '<div class="no-result">계산 버튼을 눌러주세요</div>' }}></div>
                                 {coatingResults && <button className="btn btn-copy mt-4" id="coatingCopyBtn" onClick={() => copyResults('coating')}>결과 복사하기</button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {copySuccess && <div className="copy-success fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-8 py-4 rounded-lg shadow-lg text-lg z-50">결과가 복사되었습니다!</div>}
            <style>{`
                .tab-buttons { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
                .dark .tab-buttons { border-bottom-color: #334155; }
                .tab-buttons .tab-button { background-color: #f1f5f9; color: #475569; padding: 10px 20px; border: none; border-radius: 8px 8px 0 0; cursor: pointer; font-size: 16px; transition: all 0.3s; flex: 1; min-width: 120px; }
                .dark .tab-buttons .tab-button { background-color: #1e293b; color: #94a3b8; }
                .tab-buttons .tab-button:hover { background-color: #e2e8f0; }
                .dark .tab-buttons .tab-button:hover { background-color: #334155; }
                .tab-buttons .tab-button.active { background-color: #0ea5e9; color: white; }
                .dark .tab-buttons .tab-button.active { background-color: #38bdf8; }

                .calculator-section { display: none; }
                .calculator-section.active { display: block; animation: fadeIn 0.5s; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .input-section, .result-section { flex: 1; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
                .dark .input-section, .dark .result-section { border-color: #334155; }
                .result-section { background-color: #f8fafc; min-height: 400px; }
                .dark .result-section { background-color: #1e293b; }
                
                .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; transition: background-color 0.3s; color: white; }
                .btn:hover { opacity: 0.9; }
                .btn[disabled] { opacity: 0.5; cursor: not-allowed; }
                .btn.btn-add { background-color: #3b82f6; }
                .btn.btn-clear { background-color: #f97316; }
                .btn.btn-reset { background-color: #64748b; }
                .btn.btn-remove { background-color: #ef4444; padding: 5px 10px; font-size: 14px; }
                .btn.btn-copy { background-color: #8b5cf6; }
                
                .result-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
                .dark .result-item { border-bottom-color: #334155; }
                .result-item:last-child { border-bottom: none; }
                .result-value { font-weight: bold; }
                .total-row { margin-top: 10px; padding-top: 10px; border-top: 2px solid #1e293b; font-weight: bold; }
                .dark .total-row { border-top-color: #e2e8f0; }
                .no-result { text-align: center; color: #94a3b8; padding: 40px; }
                .colon { font-size: 20px; font-weight: bold; padding: 0 5px; }

                .addition-card { padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 5px solid; display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; align-items: center; }
                .addition-card .material-name { font-size: 1.1em; font-weight: bold; grid-column: 1 / 2; }
                .addition-card .material-action { font-size: 0.8em; color: #64748b; grid-column: 1 / 2; }
                .dark .addition-card .material-action { color: #94a3b8; }
                .addition-card .material-weight { font-size: 1.5em; font-weight: bold; grid-column: 2 / 3; grid-row: 1 / 3; justify-self: end; }
                
                .addition-card.base-material { background-color: #e3f2fd; border-color: #1565c0; }
                .dark .addition-card.base-material { background-color: rgba(21, 101, 192, 0.2); }
                .addition-card.base-material .material-name, .addition-card.base-material .material-weight { color: #1565c0; }
                .dark .addition-card.base-material .material-name, .dark .addition-card.base-material .material-weight { color: #90caf9; }

                .addition-card.component-1, .addition-card.pigment { background-color: #e8f5e9; border-color: #2e7d32; }
                .dark .addition-card.component-1, .dark .addition-card.pigment { background-color: rgba(46, 125, 50, 0.2); }
                .addition-card.component-1 .material-name, .addition-card.component-1 .material-weight, .addition-card.pigment .material-name, .addition-card.pigment .material-weight { color: #2e7d32; }
                .dark .addition-card.component-1 .material-name, .dark .addition-card.component-1 .material-weight, .dark .addition-card.pigment .material-name, .dark .addition-card.pigment .material-weight { color: #a5d6a7; }

                .addition-card.component-2 { background-color: #fff3e0; border-color: #e65100; }
                .dark .addition-card.component-2 { background-color: rgba(230, 81, 0, 0.2); }
                .addition-card.component-2 .material-name, .addition-card.component-2 .material-weight { color: #e65100; }
                .dark .addition-card.component-2 .material-name, .dark .addition-card.component-2 .material-weight { color: #ffcc80; }
            `}</style>
        </>
    );
};

export default FormulationCalculator;