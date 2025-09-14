

import React, { useState, useMemo } from 'react';

interface TeamMember {
  name: string;
  title: string;
  contact: string;
  location: string;
}

interface Department {
  name: string;
  members: TeamMember[];
}

const teamData: Department[] = [
  {
    name: "총괄",
    members: [
      { name: "이현석", title: "본부장", contact: "010-9235-0779", location: "화성지점" },
    ].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  },
  {
    name: "공장장",
    members: [
      { name: "김영권", title: "상무이사", contact: "010-5274-4547", location: "화성지점" },
    ].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  },
  {
    name: "관리부",
    members: [
      { name: "허미화", title: "조장", contact: "010-7374-2229", location: "화성지점" },
    ].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  },
  {
    name: "현장관리자",
    members: [
      { name: "권용찬", title: "과장", contact: "010-5758-8082", location: "화성지점" },
      { name: "김성균", title: "직장", contact: "010-5439-8194", location: "화성지점" },
      { name: "김영석", title: "부직장", contact: "010-6850-0227", location: "화성지점" },
      { name: "신경호", title: "직장", contact: "010-4939-8301", location: "화성지점" },
      { name: "정승태", title: "선임직장", contact: "010-9199-4868", location: "화성지점" },
      { name: "정원익", title: "부장", contact: "010-4378-9008", location: "화성지점" },
    ].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  },
  {
    name: "제품관리부",
    members: [
      { name: "권용식", title: "과장", contact: "010-4722-1026", location: "화성지점" },
      { name: "신정헌", title: "반장", contact: "010-9981-5871", location: "화성지점" },
    ].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  },
  {
    name: "품질관리",
    members: [
      { name: "김경화", title: "조장", contact: "010-8321-0877", location: "화성지점" },
      { name: "유향란", title: "조장", contact: "010-5300-6832", location: "화성지점" },
      { name: "유호령", title: "사원", contact: "010-8786-9715", location: "화성지점" },
      { name: "임정애", title: "주임", contact: "010-7618-6857", location: "화성지점" },
      { name: "정연자", title: "반장", contact: "010-7392-2684", location: "화성지점" },
      { name: "최해월", title: "조장", contact: "010-6798-1986", location: "화성지점" },
    ].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  },
];

const deptColors: { [key: string]: { bg: string, text: string, border: string } } = {
    "총괄": { bg: "bg-blue-100 dark:bg-blue-900/50", text: "text-blue-800 dark:text-blue-200", border: "border-blue-400" },
    "공장장": { bg: "bg-purple-100 dark:bg-purple-900/50", text: "text-purple-800 dark:text-purple-200", border: "border-purple-400" },
    "관리부": { bg: "bg-green-100 dark:bg-green-900/50", text: "text-green-800 dark:text-green-200", border: "border-green-400" },
    "현장관리자": { bg: "bg-yellow-100 dark:bg-yellow-900/50", text: "text-yellow-800 dark:text-yellow-200", border: "border-yellow-400" },
    "제품관리부": { bg: "bg-indigo-100 dark:bg-indigo-900/50", text: "text-indigo-800 dark:text-indigo-200", border: "border-indigo-400" },
    "품질관리": { bg: "bg-cyan-100 dark:bg-cyan-900/50", text: "text-cyan-800 dark:text-cyan-200", border: "border-cyan-400" },
};


const TeamManagement: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = useMemo(() => {
        if (!searchTerm) return teamData;
        const lowercasedFilter = searchTerm.toLowerCase();
        
        return teamData
            .map(dept => ({
                ...dept,
                members: dept.members.filter(member =>
                    member.name.toLowerCase().includes(lowercasedFilter) ||
                    member.title.toLowerCase().includes(lowercasedFilter)
                ),
            }))
            .filter(dept => dept.members.length > 0);
    }, [searchTerm]);
    
    const totalMembers = useMemo(() => teamData.reduce((acc, dept) => acc + dept.members.length, 0), []);
    const totalDepartments = teamData.length;

    return (
        <div className="p-4 h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <div className="flex-shrink-0 mb-6 border-b dark:border-slate-700 pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">팀 관리 / 조직도</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                            총 인원: <span className="font-semibold text-primary-600 dark:text-primary-400">{totalMembers}명</span> / 
                            총 부서: <span className="font-semibold text-primary-600 dark:text-primary-400">{totalDepartments}개</span>
                        </p>
                    </div>
                    <div className="relative w-full md:w-72">
                         <input
                            type="text"
                            placeholder="이름 또는 직급으로 검색..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700"
                            lang="ko"
                        />
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                {filteredData.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {filteredData.map(dept => (
                            <div key={dept.name} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg shadow-md flex flex-col">
                                <div className={`p-3 border-b-2 ${deptColors[dept.name]?.border || 'border-gray-400'} dark:border-opacity-50`}>
                                    <h3 className={`font-semibold ${deptColors[dept.name]?.text || 'text-gray-800 dark:text-gray-200'}`}>
                                        {dept.name} ({dept.members.length})
                                    </h3>
                                </div>
                                <ul className="divide-y divide-slate-200 dark:divide-slate-700 p-2">
                                    {dept.members.map(member => (
                                        <li key={`${dept.name}-${member.name}`} className="flex items-center space-x-4 p-3">
                                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg ${deptColors[dept.name]?.bg || 'bg-gray-200'} ${deptColors[dept.name]?.text || 'text-gray-700'}`}>
                                                {member.name.slice(-2)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-slate-200">
                                                    {member.name}
                                                    <span className="ml-2 text-xs font-medium text-gray-500 dark:text-slate-400">{member.title}</span>
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-slate-300">{member.contact}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-slate-400">검색 결과가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamManagement;