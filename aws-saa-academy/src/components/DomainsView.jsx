import { Shield, Network, Activity, Compass } from 'lucide-react'
import { DOMAINS } from '../utils/progressStorage'

const DOMAIN_META = [
  {
    key: DOMAINS[0],
    weight: '30%',
    title: 'Design Secure Architectures',
    icon: Shield,
    color: 'text-secondary',
    bar: 'bg-secondary',
    description:
      "Sécurisation des ressources AWS, IAM, chiffrement KMS, VPC sécurisé, WAF, GuardDuty, CloudTrail et conformité.",
  },
  {
    key: DOMAINS[1],
    weight: '26%',
    title: 'Design Resilient Architectures',
    icon: Network,
    color: 'text-[#ff9900]',
    bar: 'bg-[#ff9900]',
    description:
      "Haute disponibilité multi-AZ, découplage SQS/SNS, DR (RTO/RPO), Auto Scaling, Route 53 failover et stockage durable.",
  },
  {
    key: DOMAINS[2],
    weight: '24%',
    title: 'Design High-Performing Architectures',
    icon: Activity,
    color: 'text-secondary',
    bar: 'bg-secondary',
    description:
      "Calcul haute performance, bases de données scalables, ElastiCache, conteneurs, Kinesis et CloudFront.",
  },
  {
    key: DOMAINS[3],
    weight: '20%',
    title: 'Design Cost-Optimized Architectures',
    icon: Compass,
    color: 'text-secondary',
    bar: 'bg-secondary',
    description:
      "Spot/Reserved/Savings Plans, classes S3, lifecycle policies, NAT vs VPC endpoints et AWS Budgets.",
  },
]

export default function DomainsView({ examDomainPerformance, startExam, coursesData, completedChapters }) {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn text-left">
      <div>
        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Parcours par Domaines</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Plan officiel AWS SAA-C03 — 4 domaines, 50 questions d&apos;entraînement extraites du guide chapitre 36.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DOMAIN_META.map(({ key, weight, title, icon: Icon, color, bar, description }) => {
          const score = examDomainPerformance[key]
          const domainCourses = coursesData.filter((c) => c.domain === key && c.type === 'chapter')
          const completedInDomain = domainCourses.filter((c) => completedChapters.includes(c.id)).length

          return (
            <div
              key={key}
              className="bg-[#0c0c0f] border border-[#27272a] rounded-2xl p-6 space-y-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                    {key.replace('Domain ', 'Domaine ').replace(': ', ' — ')} ({weight})
                  </span>
                  <h3 className="text-lg font-bold text-on-surface">{title}</h3>
                </div>
                <span className={`w-10 h-10 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </span>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">{description}</p>

              <div className="text-xs text-on-surface-variant">
                Modules lus : <strong className="text-on-surface">{completedInDomain}</strong> / {domainCourses.length}
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-on-surface-variant">Score aux quiz</span>
                  <span className={`font-bold ${color}`}>
                    {score === null ? '—' : `${score}%`}
                  </span>
                </div>
                <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden">
                  {score !== null && (
                    <div className={`${bar} h-full`} style={{ width: `${score}%` }} />
                  )}
                </div>
                {score === null && (
                  <p className="text-[10px] text-on-surface-variant">Passez un quiz pour obtenir un score réel.</p>
                )}
              </div>

              <button
                onClick={() => startExam('practice', 10, key)}
                className="w-full bg-[#131315] hover:bg-[#18181b] border border-[#27272a] text-on-surface text-xs font-bold py-2 rounded-lg cursor-pointer"
              >
                Quiz domaine (10 questions)
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
